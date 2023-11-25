import { Injectable } from '@angular/core';
import { Configuration, Model, OpenAIApi } from 'openai';
import { ConfigService } from '../config.service';
import {
  BehaviorSubject,
  combineLatest,
  firstValueFrom,
  mergeMap,
  shareReplay,
} from 'rxjs';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';
import { Cache } from '../utils/cache';
import {
  createOngoingRecognizer,
  OngoingRecognition,
} from './ongoing-recognizer';
import { FirebaseService, LoginState } from './firebase.service';

export interface OpenAISettings {
  apiKey: string;
}

export interface OpenAIState {
  settings: OpenAISettings | null;
  managed: boolean | null;

  rolePlayScript: string | null;
  openai: OpenAIApi | null;
  models: Model[];
  selectedModel: Model | null;
  ready: boolean;
  error: string | null;
}

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable({
  providedIn: 'root',
})
export class OpenAiService {
  private configApiKey = 'openai-api';
  private configRolePlayKey = 'openai-roleplay';
  private configModelKey = 'openai-model';
  private totalCostKey = 'openai-total-cost';

  private modalCache = new Cache<Model[]>();
  private apiCache = new Cache<OpenAIApi>();

  totalCost = this.config.watch<number>(this.totalCostKey, 0);

  private managedSettings = new BehaviorSubject<OpenAISettings|null>(null);
  private currentState: OpenAIState|null = null;
  state$ = combineLatest([
    this.config.watch<string>(this.configApiKey),
    this.config.watch<string>(this.configRolePlayKey),
    this.config.watch<string>(this.configModelKey),
    this.managedSettings,
  ]).pipe(
    mergeMap(([api, rolePlay, model, managedSettings]) =>
      fromPromise(this.mapState(api, rolePlay, model, managedSettings)),
    ),
    shareReplay(),
  );

  constructor(private config: ConfigService, private firebase: FirebaseService) {
    this.firebase.loginState.subscribe(async (loginState: LoginState) => {
      if (loginState === 'success') {
        const totalCost = await this.firebase.getTotalCost();
        if (totalCost) {
          this.config.save(this.totalCostKey, totalCost);
        }
        const config = await firebase.getConfig();
        if (config) {
          this.managedSettings.next({
            apiKey: config.openaiApiKey,
          });
        }
      } else {
        this.managedSettings.next(null);
      }
    })
  }

  async prompt(messages: PromptMessage[]): Promise<OngoingRecognition> {
    const recognizer = createOngoingRecognizer({
      role: 'assistant',
      textPrefix: undefined,
    });
    const t0 = Date.now();

    if (!this.currentState?.settings || !this.currentState?.selectedModel) {
      console.warn('no model/apiKey');
      recognizer.complete();
      return recognizer.recognition();
    }

    const functions = [
      {
        "name": "set_light_color",
        "description": "Set your mood light to a color",
        "parameters": {
          "type": "object",
          "properties": {
            "red": {
              "type": "integer",
              "minimum": 0,
              "maximum": 255,
              "description": "the value for color red from 0 to 255",
            },
            "green": {
              "type": "integer",
              "minimum": 0,
              "maximum": 255,
              "description": "the value for color green from 0 to 255",
            },
            "blue": {
              "type": "integer",
              "minimum": 0,
              "maximum": 255,
              "description": "the value for color blue from 0 to 255",
            },
          },
          "required": ["red", "green", "blue"],
        },
      },
      {
        name: 'set_voice_volume',
        description: 'Change your voice volume',
        parameters: {
          "type": "object",
          "properties": {
            "volume": {
              "type": "integer",
              minimum: 10,
              maximum: 100,
              "description": "the voice volume that you speak from 10 to 100",
            }
          },
          "required": ["volume"],
        }
      },
      {
        name: 'change_voice',
        description: 'Change your voice style or tone',
        parameters: {
          "type": "object",
          "properties": {
            "voiceName": {
              "type": "string",
              "enum": ["ryan", "sonia"],
              "description": "the voice model name",
            },
            "voiceStyle": {
              "type": "string",
              "enum": ["cheerful", "chat"],
              "description": "the voice style of speaking",
            }
          },
          "required": ["voiceName", "voiceStyle"],
        }
      }
    ];


    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'post',
      headers: new Headers({
        // https://platform.openai.com/account/usage
        Authorization: `Bearer ${this.currentState.settings.apiKey}`,
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        model: this.currentState.selectedModel.id,
        messages: messages,
        stream: true,
        functions: functions,
        function_call: "auto",
      }),
    }).then(async (response) => {
      if (!response.body) {
        console.warn('empty body');
        recognizer.complete();
        return;
      }

      recognizer.setInitialDelay(Date.now() - t0);

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      if (!reader) {
        console.warn('empty reader');
        recognizer.complete();
        return;
      }

      let done = false;
      let fnCall = { name: '', arguments: '' };

      do {
        const { value, done } = await reader.read();
        if (done) break;
        for (const line of value.split(/\n\n/g)) {
          if (!line.startsWith('data: ')) continue;
          const data = line.replace(/^data: /, '');
          if (data !== '[DONE]') {
            const d = JSON.parse(data);
            const delta = d.choices[0].delta.content;
            const function_call = d.choices[0].delta.function_call
            if (delta) {
              recognizer.append(delta);
            } else if(function_call) {
              if (function_call.arguments) {
                fnCall.arguments += function_call.arguments;
              }
              if (function_call.name) {
                fnCall.name = function_call.name;
              }
            }
            if (d.choices[0].finish_reason === "function_call") {
              console.log(JSON.parse(fnCall.arguments), fnCall.name)
            }
          }
        }
      } while (!done);

      recognizer.complete();

      const completion = await firstValueFrom(recognizer.recognition().text$);
      const oldCost = this.config.get<number>(this.totalCostKey) ?? 0;
      const cost = await this.getCost(JSON.stringify(messages), completion);
      this.firebase.addCost(cost, 'openai');
      this.config.save(this.totalCostKey, oldCost + cost);
    });

    return recognizer.recognition();
  }

  async getModels(openai: OpenAIApi) {
    const result = await openai.listModels();
    return result.data.data.filter((d) => d.owned_by === 'openai');
  }

  setKey(key: string) {
    this.config.save(this.configApiKey, key);
  }

  setModel(model: string) {
    this.config.save(this.configModelKey, model);
  }

  setRolePlay(script: string) {
    this.config.save(this.configRolePlayKey, script);
  }

  async getCost(prompt: string, completion: string): Promise<number> {
    const promptWords = prompt.split(/\s+/g).length;
    const completionWords = completion.split(/\s+/g).length;
    // https://openai.com/pricing
    const model = (await firstValueFrom(this.state$)).selectedModel?.id ?? '';
    if (model.startsWith('gpt-4')) {
      return 0.03 * promptWords / 1000 + 0.06 * completionWords / 1000;
    }
    return 0.002 * promptWords / 1000 + 0.002 * completionWords / 1000;
  }

  async mapState(
    key: string | null,
    rolePlay: string | null,
    selectedModel: string | null,
    managedSettings: OpenAISettings | null,
  ): Promise<OpenAIState> {
    if (managedSettings) {
      key = managedSettings.apiKey!;
    }
    if (!key) {
      return {
        ready: false,
        models: [],
        selectedModel: null,
        rolePlayScript: null,
        settings: null,
        managed: false,
        openai: null,
        error: null,
      };
    }

    const openai = await this.apiCache.getOrCreate(key, () => {
      const configuration = new Configuration({
        apiKey: key!,
      });
      return new OpenAIApi(configuration);
    });

    let error = '';
    const models = await this.modalCache.getOrCreate(key, () =>
      this.getModels(openai).catch((err) => {
        if (err.message === 'Request failed with status code 401') {
          error = 'Invalid api key or no permission/quota';
        } else {
          error = 'Failed to load OpenAI models';
        }
        return [];
      }),
    );
    const model = models.find((m) => m.id === selectedModel) ?? null;


    this.currentState = {
      ready: model !== null,
      selectedModel: model,
      settings: { apiKey: key },
      managed: !!managedSettings,
      rolePlayScript: rolePlay,
      openai,
      error,
      models,
    };
    return this.currentState;
  }
}

import { Injectable } from '@angular/core';
import { ConfigService } from '../config.service';
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
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
import OpenAI from "openai";
import { Model } from "openai/resources";

export interface OpenAISettings {
  apiKey: string;
}

export interface OpenAIState {
  settings: OpenAISettings | null;
  managed: boolean | null;

  rolePlayScript: string | null;
  openai: OpenAI | null;
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
  private apiCache = new Cache<OpenAI>();

  totalCost = this.config.watch<number>(this.totalCostKey, 0);

  private managedSettings = new BehaviorSubject<OpenAISettings|null>(null);
  private currentState: OpenAIState|null = null;
  state$ = combineLatest([
    this.config.watch<string>(this.configApiKey).pipe(debounceTime(500)),
    this.config.watch<string>(this.configRolePlayKey).pipe(debounceTime(500)),
    this.config.watch<string>(this.configModelKey),
    this.managedSettings,
  ]).pipe(
    mergeMap(([api, rolePlay, model, managedSettings]) =>
      fromPromise(this.mapState(api, rolePlay, model, managedSettings)),
    ),
    shareReplay(1),
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

      let fnCall = { name: '', arguments: '' };
      let done = false, completion = '';

      do {
        const { value, done } = await reader.read();
        if (done) break;
        for (const line of value.split(/\n\n/g)) {
          if (!line.startsWith('data: ')) continue;
          const data = line.replace(/^data: /, '');
          completion += data;
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

      const oldCost = this.config.get<number>(this.totalCostKey) ?? 0;
      const cost = await this.getCost(JSON.stringify(messages), completion);
      this.firebase.addCost(cost, 'openai');
      this.config.save(this.totalCostKey, oldCost + cost);
    }).catch(error => {
      console.log('Could not prompt openai', error);
    });

    return recognizer.recognition();
  }

  async getModels(openai: OpenAI) {
    return new Promise<Model[]>((resolve, reject) => {
      openai.models.list({}).then(result => {
        resolve(result.data.filter((d) => d.owned_by === 'openai'));
      });
    });
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

  countTokens(text: string): number {
    const words = text.split(/\s+/g).length;
    // https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
    return Math.round(words * 4 / 3);
  }

  async getCost(prompt: string, completion: string): Promise<number> {
    const promptTokens = this.countTokens(prompt);
    const completionTokens = this.countTokens(completion);
    // https://openai.com/pricing
    const model = (await firstValueFrom(this.state$)).selectedModel?.id ?? '';
    const cost =
    model.startsWith('gpt-4')
    ? 0.03 * promptTokens / 1000 + 0.06 * completionTokens / 1000
    : 0.002 * promptTokens / 1000 + 0.002 * completionTokens / 1000;
    // console.log('getCost', model, promptTokens, completionTokens, '->', cost);
    return cost;
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
        rolePlayScript: rolePlay,
        settings: null,
        managed: false,
        openai: null,
        error: null,
      };
    }

    const openai = await this.apiCache.getOrCreate(key, () => {
      return new OpenAI({
        apiKey: key!,
        dangerouslyAllowBrowser: true,
      });
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

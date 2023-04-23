import { Injectable } from '@angular/core';
import { Configuration, Model, OpenAIApi } from 'openai';
import { ConfigService } from '../config.service';
import {
  combineLatest,
  firstValueFrom,
  mergeMap,
  Observable,
  of,
  share,
  shareReplay,
  take,
} from 'rxjs';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';
import { Cache } from '../utils/cache';
import { ChatCompletionRequestMessage } from 'openai/api';

export interface OpenAISettings {
  apiKey: string;
}

export enum Role {
  Assistant = 'assistant',
  User = 'user',
  System = 'system'
};

export interface ConversationMessage {
  role: Role
  content: string;
}

export interface MessageResponse {
  choices: string[];
}

export interface OpenAIState {
  settings: OpenAISettings | null;

  rolePlayScript: string | null;
  openai: OpenAIApi | null;
  models: Model[];
  selectedModel: Model | null;
  ready: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class OpenAiService {
  private configApiKey = 'openai-api';
  private configRolePlayKey = 'openai-roleplay';
  private configModelKey = 'openai-model';

  private modalCache = new Cache<Model[]>();
  private apiCache = new Cache<OpenAIApi>();

  state$ = combineLatest([
    this.config.watch<string>(this.configApiKey),
    this.config.watch<string>(this.configRolePlayKey),
    this.config.watch<string>(this.configModelKey),
  ]).pipe(
    mergeMap(([api, rolePlay, model]) =>
      fromPromise(this.mapState(api, rolePlay, model)),
    ),
    shareReplay(),
  );

  constructor(private config: ConfigService) {}

  async prompt(
    messages: ConversationMessage[],
  ): Promise<ConversationMessage | null> {
    const openAiState = await firstValueFrom(this.state$);
    if (!openAiState.openai || !openAiState.selectedModel) {
      return null;
    }

    const response = await openAiState.openai
      .createChatCompletion({
        messages,
        model: openAiState.selectedModel.id,
        //stream: true,
      });
    const choice = response.data.choices[0];
    if (!choice || !choice.message) {
      return null;
    }

    return {
      role: Role.Assistant,
      content: choice.message.content,
    }
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

  async mapState(
    key: string | null,
    rolePlay: string | null,
    selectedModel: string | null,
  ): Promise<OpenAIState> {
    if (!key) {
      return {
        ready: false,
        models: [],
        selectedModel: null,
        rolePlayScript: null,
        settings: null,
        openai: null,
        error: null,
      };
    }

    const openai = await this.apiCache.getOrCreate(key, () => {
      const configuration = new Configuration({
        apiKey: key,
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
    return {
      ready: model !== null,
      selectedModel: model,
      settings: { apiKey: key },
      rolePlayScript: rolePlay,
      openai,
      error,
      models,
    };
  }
}

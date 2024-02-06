import { OngoingRecognizer } from './ongoing-recognizer';
import OpenAI from 'openai';
import ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;
import config from 'config';
import ChatCompletionCreateParams = OpenAI.ChatCompletionCreateParams;

const apiKey = process.env.OPENAI_API_KEY ?? '';
const apiModel = process.env.OPENAI_API_MODEL;
const openAi = new OpenAI({apiKey});

const functions = config.get<ChatCompletionCreateParams.Function[]>('assistant.functions');

export function ask(recognizer: OngoingRecognizer, messages: ChatCompletionMessageParam[]) {
  const stream = openAi.beta.chat.completions.stream({
    model: apiModel as 'gpt-3.5-turbo',
    stream: true,
    messages,
    functions,
    function_call: functions.length > 0 ? 'auto' : undefined,
  })
  stream.on('content', async (delta) => {
    recognizer.append(delta);
  })
  stream.on('finalFunctionCall', async (delta) => {
    recognizer.append(`Funktion aufgerufen: ${delta.name} mit Argumenten (${delta.arguments})`);
  })
  stream.on('end', () => {
    recognizer.complete();
  });
  stream.on('error', err => {
    console.error(err)
  })
}

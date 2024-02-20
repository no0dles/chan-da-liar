import { OngoingRecognizer } from './ongoing-recognizer';
import OpenAI from 'openai';
import ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;
import config from 'config';
import ChatCompletionCreateParams = OpenAI.ChatCompletionCreateParams;

const apiKey = process.env.OPENAI_API_KEY ?? '';
const apiModel = process.env.OPENAI_API_MODEL;
const openAi = new OpenAI({apiKey});

const functions = config.get<(ChatCompletionCreateParams.Function & { response: string })[]>('assistant.functions');

export function ask(recognizer: OngoingRecognizer, messages: ChatCompletionMessageParam[]) {
  const stream = openAi.beta.chat.completions.stream({
    model: apiModel as 'gpt-3.5-turbo',
    stream: true,
    messages,
    functions: functions.length > 0 ? functions : undefined,
    function_call: functions.length > 0 ? 'auto' : undefined,
  })
  stream.on('content', async (delta) => {
    recognizer.append(delta);
  })
  stream.on('finalFunctionCall', async (fn) => {
    const calledFn = functions.find(f => f.name === fn.name);
    if (calledFn) {
      recognizer.append(calledFn.response);
    }
    console.log(fn)
  })
  stream.on('end', () => {
    recognizer.complete();
  });
  stream.on('error', err => {
    console.error(err)
  })
}

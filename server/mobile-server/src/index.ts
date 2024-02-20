import { getAudio, getTranscription } from './speak';

require('dotenv').config();

import express from 'express';
import { lightController } from './pulse';
import { Server, Socket } from 'socket.io';
import { join } from 'path';
import { createServer } from 'node:http';
import {
  SpeechConfig,
} from 'microsoft-cognitiveservices-speech-sdk';
import { ask } from './chatgpt';
import { createOngoingRecognizer } from './ongoing-recognizer';
import config from 'config';

const app = express();
app.use(express.static('public'));
app.get('/', (req, res) => {
  return res.sendFile(join(process.cwd(), './public/index.html'));
});

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.get<string>('cors.origin'),
  },
});
const light = lightController();

const clients: Socket[] = [];

io.on('connection', (socket) => {
  console.log('user connected');

  const messages: { role: 'system' | 'assistant' | 'user', content: string }[] = [{
    role: 'system',
    content: config.get<string>('assistant.systemPrompt'),
  }];

  const defaultLanguage = config.get<string>('defaultLanguage');
  const defaultVoice = config.get<string>(`languages.${defaultLanguage}.voice`);


  socket.emit('config', {
    languages: Object.entries(config.get<{ voice: string, intro: string; record: string; name: string }[]>('languages'))
      .map(([key, value]) => ({ value: key, name: value.name, intro: value.intro, record: value.record })),
    defaultLanguage,
  });

  const speechConfig = SpeechConfig.fromSubscription(
    process.env.SPEECH_API || '',
    process.env.SPEECH_REGION || 'westeurope',
  );

  speechConfig.speechRecognitionLanguage = defaultLanguage;
  speechConfig.speechSynthesisVoiceName = defaultVoice;

  socket.on('language', (language) => {
    if (config.has(`languages.${language}`)) {
      speechConfig.speechRecognitionLanguage = language;
      speechConfig.speechSynthesisVoiceName = config.get<string>(`languages.${language}.voice`);
    }
  });

  socket.emit('init', { language: defaultLanguage });

  if (clients.length === 0) {
    light.enable();
  }

  clients.push(socket);

  socket.on('recording', () => {
    light.listen();
  });

  socket.on('speak', visums => {
    light.speak(visums);
  });

  socket.on('ask', (data) => {
    const int8Array = new Int8Array(data);
    const int16Array = new Int16Array(int8Array.buffer);

    console.log('ask');
    getTranscription(speechConfig, int16Array).then(result => {
      if (result) {
        console.log('transcribed ' + result);
        socket.emit('transcribed', { text: result });

        messages.push({ content: result, role: 'user' });

        const recognizer = createOngoingRecognizer(text => {
          messages.push({ content: result, role: 'assistant' });

          console.log('response', text);
          socket.emit('result', text);

          getAudio(speechConfig, text).then((result) => {
            socket.emit('response', result);
          });
        });

        recognizer.end.then(() => {
          light.idle();
        });

        ask(recognizer, messages);
      } else {
        console.log('no transcription');
        socket.emit('quite');
        light.idle();
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');

    const index = clients.indexOf(socket);
    if (index !== -1) {
      clients.splice(index, 1);
    }

    if (clients.length === 0) {
      light.disable();
    }
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on port ${PORT}`);
});

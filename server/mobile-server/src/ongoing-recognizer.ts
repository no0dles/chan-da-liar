
export interface OngoingRecognizer {
  append(text: string): void;
  complete(): void;
  end: Promise<void>;
}


export function createOngoingRecognizer(cb: (response: string) => void): OngoingRecognizer {
  let resolveFn: () => void;

  let currentValue = ''
  const end = new Promise<void>((resolve) => {
    resolveFn = resolve;
  })

  return {
    append(text: string) {
      const newText = currentValue + text;
      const cs = ['?','!', '. '];
      for (const c of cs) {
        const i = newText.lastIndexOf(c);
        if (i !== -1) {
          cb(newText.substring(0, i + 1).trim())
          currentValue = newText.substring(i + 1)
          return
        }
      }

      currentValue = newText
    },
    complete() {
      if (currentValue.length > 0) {
        cb(currentValue.trim())
      }
      resolveFn();
    },
    end,
  }
}

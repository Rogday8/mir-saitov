import mqtt, { type MqttClient } from 'mqtt';

// Связь «большой экран ↔ телефоны зрителей» без своего сервера: бесплатные публичные MQTT-брокеры
// по WebSocket. Сообщения публичные (видит любой, кто знает комнату) — передаём только счёт и выбор команды.
export const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
const ROOT = 'mirsaitov/v1';

export const topics = (room: string) => ({
  state: `${ROOT}/${room}/state`, // экран → телефоны: фаза игры и счёт (retained)
  input: `${ROOT}/${room}/in`, // телефоны → экран: выбор команды и нажатия
});

export type Phase = 'lobby' | 'count' | 'race' | 'end';
export interface StateMsg {
  phase: Phase;
  at: number; // время начала фазы (ms, по часам экрана)
  progress: Record<string, number>; // 0..1 по командам
  players: Record<string, number>;
  winner?: string;
}
export interface InputMsg {
  p: string; // id игрока
  t: string; // команда
  n: number; // нажатий с прошлого сообщения
  j?: 1; // «я пришёл»
}

/** Подключение: пробуем брокеры по очереди, пока один не ответит */
export function connect(prefer = 0, onStatus?: (s: string) => void): Promise<{ client: MqttClient; broker: number }> {
  const order = [prefer, ...BROKERS.map((_, i) => i).filter((i) => i !== prefer)];
  return new Promise((resolve, reject) => {
    const tryNext = (k: number) => {
      if (k >= order.length) return reject(new Error('Нет связи с сервером сообщений'));
      const i = order[k];
      onStatus?.(`Подключаемся… (${i + 1})`);
      const c = mqtt.connect(BROKERS[i], { connectTimeout: 6000, reconnectPeriod: 2000, clean: true, keepalive: 30 });
      const timer = setTimeout(() => {
        c.end(true);
        tryNext(k + 1);
      }, 7000);
      c.once('connect', () => {
        clearTimeout(timer);
        resolve({ client: c, broker: i });
      });
    };
    tryNext(0);
  });
}

export const makeRoom = () => {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => A[(Math.random() * A.length) | 0]).join('');
};

export const playerId = () => {
  try {
    const k = 'mir-player';
    let id = sessionStorage.getItem(k);
    if (!id) {
      id = Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(k, id);
    }
    return id;
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
};

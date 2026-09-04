import type { IElement, IPoint } from "./elements.types";

// Все типы ниже это shape сетевых WS-сообщений между клиентом и сервером.
// Имена-префиксы IWs соответствуют событиям сокета (board:state, user:joined, и т.д.).

// Профиль пользователя онлайн на доске.
export interface IWsOnlineUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

// Полное состояние доски при подключении: все элементы и список онлайн-пользователей.
export interface IWsBoardState {
  elements: IElement[];
  users: IWsOnlineUser[];
}

// Пользователь подключился к доске.
export interface IWsUserJoined {
  user: IWsOnlineUser;
}

// Пользователь отключился от доски.
export interface IWsUserLeft {
  userId: string;
}

// Чужой курсор переместился. user - короткая выжимка профиля для отображения подписи.
export interface IWsCursorUpdated {
  userId: string;
  x: number;
  y: number;
  user: Pick<IWsOnlineUser, "name" | "avatar">;
}

// Чужой курсор скрылся (пользователь покинул контейнер доски).
export interface IWsCursorRemoved {
  userId: string;
}

// Live-стриминг рисуемого штриха другого пользователя. Сейчас не отображается, см. BoardSync.
export interface IWsElementDrawing {
  userId: string;
  elementId: string;
  points: IPoint[];
  color: string;
  width: number;
}

// Новый элемент создан другим пользователем.
export interface IWsElementCreated {
  element: IElement;
}

// Изменение полей существующего элемента (move, resize, edit).
export interface IWsElementUpdated {
  elementId: string;
  patch: Record<string, unknown>;
}

// Удаление одного или нескольких элементов.
export interface IWsElementDeleted {
  elementIds: string[];
}

// Ошибка от сервера, отображается через onToast.
export interface IWsBoardError {
  message: string;
}

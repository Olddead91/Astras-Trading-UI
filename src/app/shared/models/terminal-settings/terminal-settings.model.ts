﻿import { TimezoneDisplayOption } from '../enums/timezone-display-option';
import { ThemeType } from '../settings/theme-settings.model';
import { PortfolioKey } from "../portfolio-key.model";
import { TableRowHeight } from "../enums/table-row-height";

export interface HotKeyMeta {
  key: string;
  code: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
}

export interface HotKeysSettings {
  cancelOrdersKey?: HotKeyMeta | string;
  closePositionsKey?: HotKeyMeta | string;
  centerOrderbookKey?: HotKeyMeta | string;
  cancelOrderbookOrders?: HotKeyMeta | string;
  cancelStopOrdersCurrent?: HotKeyMeta;
  closeOrderbookPositions?: HotKeyMeta | string;
  reverseOrderbookPositions?: HotKeyMeta | string;
  buyMarket?: HotKeyMeta | string;
  sellMarket?: HotKeyMeta | string;
  workingVolumes?: string[];
  sellBestOrder?: HotKeyMeta | string;
  buyBestOrder?: HotKeyMeta | string;
  buyBestAsk?: HotKeyMeta | string;
  sellBestBid?: HotKeyMeta | string;
  increaseScale?: HotKeyMeta;
  decreaseScale?: HotKeyMeta;
  extraHotKeys?: boolean;
}

export enum ScalperOrderBookMouseAction {
  LimitBuyOrder = 'limitBuyOrder',
  LimitSellOrder = 'limitSellOrder',
  MarketBuyOrder = 'marketBuyOrder',
  MarketSellOrder = 'marketSellOrder',
  StopLimitBuyOrder = 'stopLimitBuyOrder',
  StopLimitSellOrder = 'stopLimitSellOrder',
  StopLossOrder = 'stopLossOrder'
}

export interface ScalperOrderBookMouseActionsMapItem {
  button: 'left' | 'right';

  orderBookRowType: 'ask' | 'bid' | 'spread' | 'any';

  modifier?: 'shift' | 'ctrl' | null;
  action: ScalperOrderBookMouseAction;
}

export enum MouseActionsSchemes {
  Scheme1 = 'scheme1',
  Scheme2 = 'scheme2'
}

export interface ScalperOrderBookMouseActionsMap {
  mapName: MouseActionsSchemes;
  actions: ScalperOrderBookMouseActionsMapItem[];
}

export enum GridType {
  Fit = 'fit',
  VerticalFixed = 'verticalFixed',
  HorizontalFixed = 'horizontalFixed'
}

export interface DesignSettings {
  theme?: ThemeType;
  gridType?: GridType;
}

export interface PortfolioCurrencySettings {
  portfolio: PortfolioKey;
  currency: string;
}

export enum OrdersInstantNotificationType {
  OrderCreated = 'orderCreated',
  OrderSubmitFailed = 'orderSubmitFailed',
  OrderFilled = 'orderFilled',
  OrderPartiallyFilled = 'orderPartiallyFilled',
  OrderStatusChanged = 'orderStatusChanged',
  OrderStatusChangeToCancelled = 'OrderStatusChangeToCancelled',
  OrderCancelled = 'orderCancelled',
  OrderUpdated = 'orderUpdated',
  OrderUpdateFailed = 'orderUpdateFailed',
  OrdersGroupCreated = 'ordersGroupCreated'
}

export enum CommonInstantNotificationType {
  Common = 'common'
}

export enum SessionInstantNotificationType {
  EndOfSession = 'endOfSession'
}

export enum ScalperOrderBookInstantNotificationType {
  EmptyPositions = 'emptyPositions'
}

export type InstantNotificationType = CommonInstantNotificationType |
  OrdersInstantNotificationType |
  SessionInstantNotificationType |
  ScalperOrderBookInstantNotificationType;

export interface InstantNotificationsSettings {
  hiddenNotifications?: InstantNotificationType[];
  hiddenPortfoliosForNotifications?: PortfolioKey[];
}

export interface TerminalSettings {
  timezoneDisplayOption?: TimezoneDisplayOption;
  userIdleDurationMin?: number;
  language?: 'en' | 'ru' | null;
  tableRowHeight?: TableRowHeight;
  badgesBind?: boolean;
  hotKeysSettings?: HotKeysSettings;
  scalperOrderBookMouseActions?: ScalperOrderBookMouseActionsMap;
  designSettings?: DesignSettings;
  portfoliosCurrency?: PortfolioCurrencySettings[];
  instantNotificationsSettings?: InstantNotificationsSettings;
}

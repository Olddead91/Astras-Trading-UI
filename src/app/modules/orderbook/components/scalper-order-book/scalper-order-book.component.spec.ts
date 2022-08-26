import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';

import { ScalperOrderBookComponent } from './scalper-order-book.component';
import {
  BehaviorSubject,
  Subject,
  take
} from "rxjs";
import {
  ScalperOrderBookRow,
  ScalperOrderBookRowType
} from "../../models/scalper-order-book.model";
import { WidgetSettingsService } from "../../../../shared/services/widget-settings.service";
import { InstrumentsService } from "../../../instruments/services/instruments.service";
import { TerminalSettingsService } from "../../../terminal-settings/services/terminal-settings.service";
import {
  generateRandomString,
  getRandomInt,
  ngZorroMockComponents
} from "../../../../shared/utils/testing";
import {
  ScalperOrderBookSettings,
  VolumeHighlightMode
} from "../../../../shared/models/settings/scalper-order-book-settings.model";
import { ScalperOrderBookService } from "../../services/scalper-order-book.service";
import { TerminalSettings } from "../../../../shared/models/terminal-settings/terminal-settings.model";
import { Instrument } from "../../../../shared/models/instruments/instrument.model";
import { ScalperOrdersService } from "../../services/scalper-orders.service";
import { HotKeyCommandService } from "../../../../shared/services/hot-key-command.service";
import { TerminalCommand } from "../../../../shared/models/terminal-command";
import { ScalperOrderBookCommands } from "../../models/scalper-order-book-commands";
import { Side } from "../../../../shared/models/enums/side.model";
import { OrderbookData } from '../../models/orderbook-data.model';
import { Order } from '../../../../shared/models/orders/order.model';
import { OrderBookDataFeedHelper } from '../../utils/order-book-data-feed.helper';

describe('ScalperOrderBookComponent', () => {
  let component: ScalperOrderBookComponent;
  let fixture: ComponentFixture<ScalperOrderBookComponent>;

  const orderBookDefaultSettings: ScalperOrderBookSettings = {
    guid: generateRandomString(10),
    symbol: 'SBER',
    exchange: 'MOEX',
    enableMouseClickSilentOrders: true,
    disableHotkeys: false,
    volumeHighlightFullness: 1000,
    volumeHighlightMode: VolumeHighlightMode.BiggestVolume,
    showSpreadItems: false,
    showZeroVolumeItems: false,
    volumeHighlightOptions: [],
    workingVolumes: []
  };

  const defaultInstrumentInfo: Instrument = {
    symbol: orderBookDefaultSettings.symbol,
    exchange: orderBookDefaultSettings.exchange,
    shortName: orderBookDefaultSettings.symbol,
    description: orderBookDefaultSettings.symbol,
    currency: "RUB",
    minstep: 0.01
  };

  const defaultLastPrice = 101.24;
  const settingsMock = new BehaviorSubject<ScalperOrderBookSettings>(orderBookDefaultSettings);
  const orderBookDataMock = new Subject<OrderbookData>();
  const lastPriceMock = new BehaviorSubject<number>(defaultLastPrice);
  const currentOrdersMock = new BehaviorSubject<Order[]>([]);
  const terminalSettingsMock = new Subject<TerminalSettings>();
  const instrumentMock = new BehaviorSubject<Instrument>(defaultInstrumentInfo);
  const hotKeyCommandMock = new Subject<TerminalCommand>();

  let widgetSettingsServiceSpy: any;
  let scalperOrderBookServiceSpy: any;
  let terminalSettingsServiceSpy: any;
  let instrumentsServiceSpy: any;
  let scalperOrdersServiceSpy: any;
  let hotKeyCommandServiceSpy: any;

  beforeEach(() => {
    widgetSettingsServiceSpy = jasmine.createSpyObj(
      'WidgetSettingsService',
      [
        'getSettings',
        'updateSettings'
      ]
    );

    widgetSettingsServiceSpy.getSettings.and.returnValue(settingsMock);

    scalperOrderBookServiceSpy = jasmine.createSpyObj(
      'ScalperOrderBookService',
      [
        'getOrderBook',
        'getLastPrice',
        'getCurrentOrders'
      ]
    );

    scalperOrderBookServiceSpy.getOrderBook.and.returnValue(orderBookDataMock);
    scalperOrderBookServiceSpy.getLastPrice.and.returnValue(lastPriceMock);
    scalperOrderBookServiceSpy.getCurrentOrders.and.returnValue(currentOrdersMock);

    terminalSettingsServiceSpy = jasmine.createSpyObj('TerminalSettingsService', ['getSettings']);
    terminalSettingsServiceSpy.getSettings.and.returnValue(terminalSettingsMock);

    instrumentsServiceSpy = jasmine.createSpyObj('HotKeyCommandService', ['getInstrument']);
    instrumentsServiceSpy.getInstrument.and.returnValue(instrumentMock);

    scalperOrdersServiceSpy = jasmine.createSpyObj(
      'ScalperOrdersService',
      [
        'cancelOrders',
        'closePositionsByMarket',
        'placeBestOrder',
        'placeMarketOrder',
        'placeLimitOrder',
        'reversePositionsByMarket',
        'setStopLimitForRow',
        'setStopLoss',
      ]
    );

    hotKeyCommandServiceSpy = jasmine.createSpyObj('HotKeyCommandService', ['commands$']);
    hotKeyCommandServiceSpy.commands$ = hotKeyCommandMock;
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        ScalperOrderBookComponent,
        ...ngZorroMockComponents
      ],
      providers: [
        { provide: WidgetSettingsService, useValue: widgetSettingsServiceSpy },
        { provide: TerminalSettingsService, useValue: terminalSettingsServiceSpy },
        { provide: ScalperOrderBookService, useValue: scalperOrderBookServiceSpy },
        { provide: InstrumentsService, useValue: instrumentsServiceSpy },
        { provide: HotKeyCommandService, useValue: hotKeyCommandServiceSpy },
        { provide: ScalperOrdersService, useValue: scalperOrdersServiceSpy },
      ],
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ScalperOrderBookComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Hot keys', () => {
    it('should process cancelLimitOrdersAll command', fakeAsync(() => {
        const expectedOrder = {
          id: generateRandomString(5),
          qty: 10,
          type: 'limit',
          exchange: orderBookDefaultSettings.exchange,
          portfolio: 'D1234',
          price: 100,
        } as Order;

        currentOrdersMock.next([expectedOrder]);
        tick();
        hotKeyCommandMock.next({ type: ScalperOrderBookCommands.cancelLimitOrdersAll });

        tick();
        expect(scalperOrdersServiceSpy.cancelOrders).toHaveBeenCalledOnceWith([OrderBookDataFeedHelper.orderToCurrentOrder(expectedOrder)]);
      })
    );

    it('should process closePositionsByMarketAll command', fakeAsync(() => {
        hotKeyCommandMock.next({ type: ScalperOrderBookCommands.closePositionsByMarketAll });

        tick();
        expect(scalperOrdersServiceSpy.closePositionsByMarket).toHaveBeenCalledOnceWith(orderBookDefaultSettings);
      })
    );

    it('should process cancelLimitOrdersCurrent command', fakeAsync(() => {
        const expectedOrder = {
          id: generateRandomString(5),
          qty: 10,
          type: 'limit',
          exchange: orderBookDefaultSettings.exchange,
          portfolio: 'D1234',
          price: 100,
        } as Order;

        currentOrdersMock.next([expectedOrder]);
        component.isActiveOrderBook = true;
        hotKeyCommandMock.next({ type: ScalperOrderBookCommands.cancelLimitOrdersCurrent });

        tick();
        expect(scalperOrdersServiceSpy.cancelOrders).toHaveBeenCalledOnceWith([OrderBookDataFeedHelper.orderToCurrentOrder(expectedOrder)]);
      })
    );

    it('should process closePositionsByMarketCurrent command', fakeAsync(() => {
        component.isActiveOrderBook = true;
        hotKeyCommandMock.next({ type: ScalperOrderBookCommands.closePositionsByMarketCurrent });

        tick();
        expect(scalperOrdersServiceSpy.closePositionsByMarket).toHaveBeenCalledOnceWith(orderBookDefaultSettings);
      })
    );

    it('should process sellBestOrder command', fakeAsync(() => {
        const workingVolume = Math.round(Math.random() * 100);

        orderBookDataMock.next({
          a: [{
            p: Math.round(Math.random() * 1000),
            v: Math.round(Math.random() * 100),
            y: 0
          }],
          b: [],
        });

        component.isActiveOrderBook = true;
        component.activeWorkingVolume$.next(workingVolume);
        hotKeyCommandMock.next({ type: ScalperOrderBookCommands.sellBestOrder });

        tick();
        expect(scalperOrdersServiceSpy.placeBestOrder).toHaveBeenCalledOnceWith(
          defaultInstrumentInfo,
          Side.Sell,
          workingVolume,
          jasmine.any(Object)
        );
      })
    );

    it('should process buyBestOrder command', fakeAsync(() => {
        const workingVolume = Math.round(Math.random() * 100);

        orderBookDataMock.next({
          a: [{
            p: Math.round(Math.random() * 1000),
            v: Math.round(Math.random() * 100),
            y: 0
          }],
          b: [],
        });

        component.isActiveOrderBook = true;
        component.activeWorkingVolume$.next(workingVolume);
        hotKeyCommandMock.next({ type: ScalperOrderBookCommands.buyBestOrder });

        tick();
        expect(scalperOrdersServiceSpy.placeBestOrder).toHaveBeenCalledOnceWith(
          defaultInstrumentInfo,
          Side.Buy,
          workingVolume,
          jasmine.any(Object)
        );
      })
    );

    it('should process sellMarket command', fakeAsync(() => {
        const workingVolume = Math.round(Math.random() * 100);

        component.isActiveOrderBook = true;
        component.activeWorkingVolume$.next(workingVolume);
        hotKeyCommandMock.next({ type: ScalperOrderBookCommands.sellMarket });

        tick();
        expect(scalperOrdersServiceSpy.placeMarketOrder).toHaveBeenCalledOnceWith(
          orderBookDefaultSettings,
          Side.Sell,
          workingVolume,
          true
        );
      })
    );

    it('should process buyMarket command', fakeAsync(() => {
        const workingVolume = Math.round(Math.random() * 100);

        component.isActiveOrderBook = true;
        component.activeWorkingVolume$.next(workingVolume);
        hotKeyCommandMock.next({ type: ScalperOrderBookCommands.buyMarket });

        tick();
        expect(scalperOrdersServiceSpy.placeMarketOrder).toHaveBeenCalledOnceWith(
          orderBookDefaultSettings,
          Side.Buy,
          workingVolume,
          true
        );
      })
    );

    it('should process reversePositionsByMarketCurrent command', fakeAsync(() => {
        component.isActiveOrderBook = true;
        hotKeyCommandMock.next({ type: ScalperOrderBookCommands.reversePositionsByMarketCurrent });

        tick();
        expect(scalperOrdersServiceSpy.reversePositionsByMarket).toHaveBeenCalledOnceWith(orderBookDefaultSettings);
      })
    );

    it('should process working volume selection', (done) => {
      component.isActiveOrderBook = true;
      component.workingVolumes = [1, 2, 3, 4, 5];
      const selectedIndex = getRandomInt(1, component.workingVolumes.length);

      hotKeyCommandMock.next({ type: selectedIndex.toString() });

      component.activeWorkingVolume$.pipe(
        take(1)
      ).subscribe(value => {
        done();
        expect(value).toBe(component.workingVolumes[selectedIndex - 1]);
      });
    });
  });

  describe('Mouse click', () => {
    it('should process Left click with Ctrl', fakeAsync(() => {
      const event = jasmine.createSpyObj(['preventDefault', 'stopPropagation']);
      event.ctrlKey = true;

      const currentSettings = {
        ...orderBookDefaultSettings,
        enableMouseClickSilentOrders: Math.random() < 0.5
      };

      settingsMock.next(currentSettings);
      const workingVolume = Math.round(Math.random() * 100);
      component.activeWorkingVolume$.next(workingVolume);

      tick();

      const testRow = {
        price: Math.round(Math.random() * 1000),
        rowType: Math.random() < 0.5 ? ScalperOrderBookRowType.Bid : ScalperOrderBookRowType.Ask
      } as ScalperOrderBookRow;

      component.onRowClick(event, testRow);

      tick();

      expect(scalperOrdersServiceSpy.setStopLimitForRow)
        .toHaveBeenCalledOnceWith(
          currentSettings,
          testRow,
          workingVolume,
          currentSettings.enableMouseClickSilentOrders
        );
    }));

    it('should process Left click with Shift', fakeAsync(() => {
      const event = jasmine.createSpyObj(['preventDefault', 'stopPropagation']);
      event.shiftKey = true;

      const currentSettings = {
        ...orderBookDefaultSettings,
        enableMouseClickSilentOrders: Math.random() < 0.5
      };

      settingsMock.next(currentSettings);

      tick();

      const testRow = {
        price: Math.round(Math.random() * 1000),
        rowType: ScalperOrderBookRowType.Ask
      } as ScalperOrderBookRow;

      component.onRowClick(event, testRow);
      tick();

      expect(scalperOrdersServiceSpy.setStopLoss)
        .toHaveBeenCalledOnceWith(
          currentSettings,
          testRow.price,
          currentSettings.enableMouseClickSilentOrders
        );
    }));

    it('should process Left click WITHOUT Ctrl and Shift', fakeAsync(() => {
      const event = jasmine.createSpyObj(['preventDefault', 'stopPropagation']);

      const currentSettings = {
        ...orderBookDefaultSettings,
        enableMouseClickSilentOrders: Math.random() < 0.5
      };

      settingsMock.next(currentSettings);
      const workingVolume = Math.round(Math.random() * 100);
      component.activeWorkingVolume$.next(workingVolume);

      tick();

      const testRow = {
        price: Math.round(Math.random() * 1000),
        rowType: Math.random() < 0.5 ? ScalperOrderBookRowType.Bid : ScalperOrderBookRowType.Ask
      } as ScalperOrderBookRow;

      component.onRowClick(event, testRow);
      tick();

      expect(scalperOrdersServiceSpy.placeLimitOrder)
        .toHaveBeenCalledOnceWith(
          currentSettings,
          testRow.rowType === ScalperOrderBookRowType.Bid ? Side.Buy : Side.Sell,
          workingVolume,
          testRow.price,
          currentSettings.enableMouseClickSilentOrders
        );
    }));

    it('should process Right click', fakeAsync(() => {
      const event = jasmine.createSpyObj(['preventDefault', 'stopPropagation']);

      const currentSettings = {
        ...orderBookDefaultSettings,
        enableMouseClickSilentOrders: Math.random() < 0.5
      };

      settingsMock.next(currentSettings);
      const workingVolume = Math.round(Math.random() * 100);
      component.activeWorkingVolume$.next(workingVolume);

      tick();

      const testRow = {
        price: Math.round(Math.random() * 1000),
        rowType: Math.random() < 0.5 ? ScalperOrderBookRowType.Bid : ScalperOrderBookRowType.Ask
      } as ScalperOrderBookRow;

      component.onRowRightClick(event, testRow);
      tick();

      expect(scalperOrdersServiceSpy.placeMarketOrder)
        .toHaveBeenCalledOnceWith(
          currentSettings,
          testRow.rowType === ScalperOrderBookRowType.Bid ? Side.Sell : Side.Buy,
          workingVolume,
          currentSettings.enableMouseClickSilentOrders
        );
    }));
  });
});

import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { WidgetSettingsService } from "../../../../shared/services/widget-settings.service";
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  Observable,
  of,
  shareReplay,
  Subject,
  take,
  takeUntil,
  tap,
  withLatestFrom
} from "rxjs";
import {
  CurrentOrder,
  ScalperOrderBookRow,
  ScalperOrderBookRowType
} from "../../models/scalper-order-book.model";
import {
  ScalperOrderBookSettings,
  VolumeHighlightMode,
  VolumeHighlightOption
} from "../../../../shared/models/settings/scalper-order-book-settings.model";
import {
  finalize,
  map,
  startWith,
  switchMap
} from "rxjs/operators";
import {
  buyColorBackground,
  sellColorBackground
} from "../../../../shared/models/settings/styles-constants";
import { InstrumentsService } from "../../../instruments/services/instruments.service";
import { mapWith } from "../../../../shared/utils/observable-helper";
import { Instrument } from "../../../../shared/models/instruments/instrument.model";
import { HotKeyCommandService } from "../../../../shared/services/hot-key-command.service";
import { Side } from "../../../../shared/models/enums/side.model";
import { TerminalSettingsService } from "../../../terminal-settings/services/terminal-settings.service";
import { isEqualScalperOrderBookSettings } from "../../../../shared/utils/settings-helper";
import { ScalperOrdersService } from "../../services/scalper-orders.service";
import { ScalperOrderBookCommands } from "../../models/scalper-order-book-commands";
import { TerminalCommand } from "../../../../shared/models/terminal-command";
import { ScalperOrderBookService } from "../../services/scalper-order-book.service";
import { DashboardItemContentSize } from '../../../../shared/models/dashboard-item.model';
import { NzTableComponent } from 'ng-zorro-antd/table';
import { OrderbookData } from '../../models/orderbook-data.model';
import { OrderbookDataRow } from '../../models/orderbook-data-row.model';
import { ScalperOrderBookComponentStore } from '../../utils/scalper-order-book-component-store';
import { OrderBookDataFeedHelper } from '../../utils/order-book-data-feed.helper';
import { InstrumentKey } from '../../../../shared/models/instruments/instrument-key.model';
import { ScalperOrderBookTableHelper } from '../../utils/scalper-order-book-table.helper';

type ExtendedSettings = { widgetSettings: ScalperOrderBookSettings, instrument: Instrument };

@Component({
  selector: 'ats-scalper-order-book[guid][shouldShowSettings][contentSize]',
  templateUrl: './scalper-order-book.component.html',
  styleUrls: ['./scalper-order-book.component.less'],
  providers: [ScalperOrderBookComponentStore]
})
export class ScalperOrderBookComponent implements OnInit, AfterViewInit, OnDestroy {
  public contentSize$ = new BehaviorSubject<DashboardItemContentSize>({ height: 100, width: 0 });

  @ViewChild('orderBookTableContainer')
  orderBookTableContainer?: ElementRef<HTMLElement>;
  @ViewChild('table')
  table?: NzTableComponent<any>;

  rowTypes = ScalperOrderBookRowType;
  maxVolume: number = 1;
  workingVolumes: number[] = [];
  activeWorkingVolume$ = new BehaviorSubject<number | null>(null);
  isActiveOrderBook = false;

  @Input() shouldShowSettings!: boolean;
  @Input() guid!: string;

  readonly tableRowHeight = 21;
  readonly priceRowsCacheSize = 50;
  public orderBookTableContainerHeight$?: Observable<number>;
  public isLoading$ = new BehaviorSubject(true);
  orderBookTableData$!: Observable<ScalperOrderBookRow[]>;
  private destroy$: Subject<boolean> = new Subject<boolean>();

  private orderBookContext?: {
    expendedSettings$: Observable<ExtendedSettings>;
    currentOrders$: Observable<CurrentOrder[]>;
    orderBookData$: Observable<OrderbookData>;
  };

  constructor(
    private readonly settingsService: WidgetSettingsService,
    private readonly scalperOrderBookStore: ScalperOrderBookComponentStore,
    private readonly terminalSettingsService: TerminalSettingsService,
    private readonly orderBookService: ScalperOrderBookService,
    private readonly instrumentsService: InstrumentsService,
    private readonly hotkeysService: HotKeyCommandService,
    private readonly scalperOrdersService: ScalperOrdersService
  ) {
  }

  @Input()
  set contentSize(value: DashboardItemContentSize | null) {
    if (!!value) {
      this.contentSize$.next(value);
    }
  }

  ngOnInit(): void {
    this.initOrderBookContext();
    this.orderBookTableData$ = this.getOrderBookTableData().pipe(
      shareReplay(1)
    );

    this.subscribeToHotkeys();
    this.subscribeToWorkingVolumesChange();
  }

  ngAfterViewInit(): void {
    this.orderBookTableContainerHeight$ = (this.getOrderBookTableContainerHeightWatch() ?? of(0)).pipe(
      shareReplay(1)
    );

    this.initPriceRowsGeneration();
    this.initTableScrolling();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.complete();

    this.activeWorkingVolume$.complete();
    this.contentSize$.complete();
  }

  selectVol(vol: number) {
    this.activeWorkingVolume$.next(vol);
  }

  getCurrentOrdersVolume(orders?: CurrentOrder[]): number | null {
    return !orders || orders.length === 0
      ? null
      : orders.reduce((previousValue, currentValue) => previousValue + currentValue.volume, 0);
  }

  getVolumeStyle(rowType: ScalperOrderBookRowType, volume: number, settings: ScalperOrderBookSettings) {
    if (rowType !== ScalperOrderBookRowType.Ask && rowType !== ScalperOrderBookRowType.Bid || !volume) {
      return null;
    }

    if (settings.volumeHighlightMode === VolumeHighlightMode.Off) {
      return null;
    }

    if (settings.volumeHighlightMode === VolumeHighlightMode.BiggestVolume) {
      const size = 100 * (volume / this.maxVolume);
      const color = rowType === ScalperOrderBookRowType.Bid
        ? buyColorBackground
        : sellColorBackground;

      return {
        background: `linear-gradient(90deg, ${color} ${size}% , rgba(0,0,0,0) ${size}%)`,
      };
    }

    let size = 0;
    const volumeHighlightOption = this.getVolumeHighlightOption(settings, volume);
    if (!volumeHighlightOption) {
      return null;
    }

    if (!!settings.volumeHighlightFullness) {
      size = 100 * (volume / settings.volumeHighlightFullness);
      if (size > 100) {
        size = 100;
      }
    }

    return {
      background: `linear-gradient(90deg, ${volumeHighlightOption.color}BF ${size}% , rgba(0,0,0,0) ${size}%)`
    };
  }

  cancelLimitOrders() {
    this.callWithCurrentOrders(orders => {
      const limitOrders = orders.filter(x => x.type === 'limit');

      this.scalperOrdersService.cancelOrders(limitOrders);
    });
  }

  cancelRowOrders(row: ScalperOrderBookRow, e: MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();

    if (!!row.currentOrders && row.currentOrders.length > 0) {
      this.scalperOrdersService.cancelOrders(row.currentOrders);
    }
  }

  onRowClick(e: MouseEvent, row: ScalperOrderBookRow) {
    e.preventDefault();
    e.stopPropagation();

    if (row.rowType !== this.rowTypes.Bid && row.rowType !== this.rowTypes.Ask) {
      return;
    }

    if (e.ctrlKey) {
      this.callWithSettings(settings => {
        this.callWithWorkingVolume(workingVolume => {
          this.scalperOrdersService.setStopLimitForRow(settings.widgetSettings, row, workingVolume, settings.widgetSettings.enableMouseClickSilentOrders);
        });
      });

      return;
    }

    if (e.shiftKey && row.rowType === this.rowTypes.Ask) {
      this.callWithSettings(settings => this.scalperOrdersService.setStopLoss(settings.widgetSettings, row.price, settings.widgetSettings.enableMouseClickSilentOrders));

      return;
    }

    if (!e.shiftKey && !e.ctrlKey) {
      this.callWithSettings(settings => {
        this.callWithWorkingVolume(workingVolume => {
          this.scalperOrdersService.placeLimitOrder(
            settings.widgetSettings,
            row.rowType === ScalperOrderBookRowType.Bid ? Side.Buy : Side.Sell,
            workingVolume,
            row.price,
            settings.widgetSettings.enableMouseClickSilentOrders
          );
        });
      });
    }
  }

  onRowRightClick(event: MouseEvent, row: ScalperOrderBookRow) {
    event.preventDefault();
    event.stopPropagation();

    if (row.rowType !== this.rowTypes.Bid && row.rowType !== this.rowTypes.Ask) {
      return;
    }

    this.callWithSettings(settings => {
      this.callWithWorkingVolume(workingVolume => {
        this.scalperOrdersService.placeMarketOrder(
          settings.widgetSettings,
          row.rowType === ScalperOrderBookRowType.Bid ? Side.Sell : Side.Buy,
          workingVolume,
          settings.widgetSettings.enableMouseClickSilentOrders
        );
      });
    });
  }

  private initPriceRowsGeneration() {
    const getLastPrice = (instrumentKey: InstrumentKey) => this.orderBookService.getLastPrice(instrumentKey).pipe(
      filter((lastPrice): lastPrice is number => !!lastPrice),
    );

    this.orderBookContext?.expendedSettings$.pipe(
      tap(() => this.isLoading$.next(true)),
      tap(() => this.scalperOrderBookStore.resetState()),
      mapWith(
        settings => getLastPrice(settings.widgetSettings),
        (settings, lastPrice) => ({
          settings,
          lastPrice
        })
      ),
      mapWith(
        () => this.orderBookTableContainerHeight$ ?? of(0),
        (source, height) => ({
          instrument: source.settings.instrument,
          lastPrice: source.lastPrice,
          containerHeight: height
        })
      ),
      takeUntil(this.destroy$)
    ).subscribe(source => {
      let rowCountToDisplay = Math.ceil(source.containerHeight / this.tableRowHeight) + this.priceRowsCacheSize;
      this.scalperOrderBookStore.setInitialRange(
        source.lastPrice,
        source.instrument.minstep,
        rowCountToDisplay,
        () => {
          ScalperOrderBookTableHelper.alignTable(
            this.table?.cdkVirtualScrollViewport,
            this.tableRowHeight,
            this.orderBookTableData$
          );
          this.isLoading$.next(false);
        }
      );
    });
  }

  private getOrderBookTableData(): Observable<ScalperOrderBookRow[]> {
    return this.orderBookContext!.expendedSettings$.pipe(
      mapWith(
        () => this.scalperOrderBookStore.rows$,
        (settings, baseRows) => ({ settings, baseRows })
      ),
      mapWith(
        () => this.orderBookContext!.currentOrders$,
        (source, currentOrders) => ({
          settings: source.settings,
          baseRows: source.baseRows,
          currentOrders
        })),
      map(source => ({
        settings: source.settings,
        baseRows: this.mapCurrentOrders(source.baseRows, source.currentOrders)
      })),
      mapWith(
        () => this.orderBookContext!.orderBookData$,
        (source, orderBookData) => ({
          settings: source.settings,
          baseRows: source.baseRows,
          orderBookData
        })
      ),
      map(source => this.mapOrderBookData(source.baseRows, source.orderBookData, source.settings.widgetSettings))
    );
  }

  private initOrderBookContext() {
    const settings$ = this.getSettingsStream()
      .pipe(
        shareReplay(1)
      );

    this.orderBookContext = {
      expendedSettings$: settings$,
      currentOrders$: this.getCurrentOrdersStream(settings$),
      orderBookData$: this.getOrderBookDataStream(settings$)
    };
  }

  private getSettingsStream(): Observable<ExtendedSettings> {
    const getInstrumentInfo = (settings: ScalperOrderBookSettings) => this.instrumentsService.getInstrument(settings).pipe(
      filter((x): x is Instrument => !!x)
    );

    return this.settingsService.getSettings<ScalperOrderBookSettings>(this.guid).pipe(
      distinctUntilChanged((previous, current) => isEqualScalperOrderBookSettings(previous, current)),
      mapWith(
        settings => getInstrumentInfo(settings),
        (widgetSettings, instrument) => ({ widgetSettings, instrument } as ExtendedSettings)
      )
    );
  }

  private getCurrentOrdersStream(settings$: Observable<ExtendedSettings>) {
    return settings$.pipe(
      switchMap(
        (settings: ExtendedSettings) => this.orderBookService.getCurrentOrders(settings.widgetSettings, this.guid)
      ),
      map(orders => orders.map(o => OrderBookDataFeedHelper.orderToCurrentOrder(o)))
    );
  }

  private getOrderBookDataStream(settings$: Observable<ExtendedSettings>) {
    return settings$.pipe(
      switchMap((settings: ExtendedSettings) => this.orderBookService.getOrderBook(settings.widgetSettings)),
      startWith(({ a: [], b: [] } as OrderbookData)),
      shareReplay(1)
    );
  }

  private initTableScrolling() {
    this.table?.cdkVirtualScrollViewport?.scrolledIndexChange
      .pipe(
        withLatestFrom(this.isLoading$),
        filter(([, isLoading]) => !isLoading),
        map(([index,]) => index),
        withLatestFrom(this.scalperOrderBookStore.rows$),
        filter(([, priceRows]) => priceRows.length > 0),
        map(([index, priceRows]) => ({ index, priceRows })),
        takeUntil(this.destroy$)
      )
      .subscribe(x => {
        console.log('index change: ', x.index);

        const bufferSize = Math.ceil(this.priceRowsCacheSize / 4);
        if (x.index < bufferSize) {
          this.isLoading$.next(true);
          this.scalperOrderBookStore.extendTop(addedItemsCount => {
            ScalperOrderBookTableHelper.scrollTableToIndex(
              this.table?.cdkVirtualScrollViewport,
              this.tableRowHeight,
              x.index + addedItemsCount,
              false,
              false
            );

            this.isLoading$.next(false);
          });

          return;
        }

        const renderedRange = this.table!.cdkVirtualScrollViewport!.getRenderedRange();
        if (renderedRange.end > x.priceRows.length - bufferSize) {
          this.isLoading$.next(true);
          this.scalperOrderBookStore.extendBottom(() => {
            this.isLoading$.next(false);
          });
        }
      });
  }

  private mapCurrentOrders(baseRows: ScalperOrderBookRow[], orders: CurrentOrder[]): ScalperOrderBookRow[] {
    if (baseRows.length === 0) {
      return baseRows;
    }

    const filteredOrders = orders.filter(x => x.type === 'limit');
    const minOrderPrice = Math.min(...filteredOrders.map(x => x.price));
    const maxOrderPrice = Math.max(...filteredOrders.map(x => x.price));

    const rows = [];
    for (let i = 0; i < baseRows.length; i++) {
      const row = { ...baseRows[i] };

      if (row.price <= maxOrderPrice && row.price >= minOrderPrice) {
        row.currentOrders = filteredOrders.filter(x => x.price === row.price);
      }

      rows.push(row);
    }


    return rows;
  }

  private mapOrderBookData(baseRows: ScalperOrderBookRow[], realtimeData: OrderbookData, settings: ScalperOrderBookSettings): ScalperOrderBookRow[] {
    if (baseRows.length === 0 || realtimeData.a.length === 0 || realtimeData.b.length === 0) {
      return baseRows;
    }

    this.maxVolume = Math.max(...[...realtimeData.a, ...realtimeData.b].map(x => x.v));

    const minBid = realtimeData.b[realtimeData.b.length - 1].p;
    const maxBid = realtimeData.b[0].p;
    const minAsk = realtimeData.a[0].p;
    const maxAsk = realtimeData.a[realtimeData.a.length - 1].p;

    const maxBasePrice = baseRows[0].price;
    const minBasePrice = baseRows[baseRows.length - 1].price;

    if (minBid < minBasePrice || maxAsk > maxBasePrice) {
      this.scalperOrderBookStore.regenerateForPrice(
        minBid,
        maxAsk,
        () => ScalperOrderBookTableHelper.alignTable(
          this.table?.cdkVirtualScrollViewport,
          this.tableRowHeight,
          this.orderBookTableData$
        )
      );

      return baseRows;
    }

    const matchRow = (targetRow: ScalperOrderBookRow, source: OrderbookDataRow[], rowType: ScalperOrderBookRowType) => {
      const matchedRowIndex = source.findIndex(x => x.p === targetRow.price);
      if (matchedRowIndex >= 0) {
        const matchedRow = source[matchedRowIndex];
        targetRow.volume = matchedRow.v;
        targetRow.isBest = matchedRowIndex === 0;
        targetRow.getVolumeStyle = () => this.getVolumeStyle(rowType, targetRow.volume ?? 0, settings);

        return true;
      }

      return false;
    };

    const rows = [];
    for (let i = 0; i < baseRows.length; i++) {
      const row = { ...baseRows[i] };

      if (row.price >= minAsk) {
        row.rowType = ScalperOrderBookRowType.Ask;
        if (row.price <= maxAsk) {
          if (matchRow(row, realtimeData.a, row.rowType) || settings.showZeroVolumeItems) {
            rows.push(row);
          }
        }
        else {
          rows.push(row);
        }
      }
      else if (row.price <= maxBid) {
        row.rowType = ScalperOrderBookRowType.Bid;
        if (row.price >= minBid) {
          if (matchRow(row, realtimeData.b, row.rowType) || settings.showZeroVolumeItems) {
            rows.push(row);
          }
        }
        else {
          rows.push(row);
        }
      }
      else if (settings.showSpreadItems) {
        row.rowType = ScalperOrderBookRowType.Spread;
        rows.push(row);
      }
    }

    return rows;
  }

  private getOrderBookTableContainerHeightWatch(): Observable<number> | null {
    if (!this.orderBookTableContainer) {
      return null;
    }

    const subject = new Subject<number>();
    const resizeObserver = new ResizeObserver(entries => {
      entries.forEach(x => {
        subject.next(Math.floor(x.contentRect.height));
      });
    });

    resizeObserver.observe(this.orderBookTableContainer.nativeElement);

    return subject.pipe(
      finalize(() => {
        if (!!this.orderBookTableContainer) {
          resizeObserver.unobserve(this.orderBookTableContainer.nativeElement);
        }

        resizeObserver.disconnect();
      })
    );
  }

  private callWithSettings(action: (settings: { widgetSettings: ScalperOrderBookSettings, instrument: Instrument }) => void) {
    this.orderBookContext!.expendedSettings$.pipe(
      take(1)
    ).subscribe(s => action(s));
  }

  private callWithWorkingVolume(action: (workingVolume: number) => void) {
    this.activeWorkingVolume$.pipe(
      take(1),
      filter(workingVolume => !!workingVolume)
    ).subscribe(workingVolume => action(workingVolume!));
  }

  private callWithCurrentOrderBook(action: (orderBook: OrderbookData) => void) {
    this.orderBookContext!.orderBookData$.pipe(
      take(1)
    ).subscribe(action);
  }

  private callWithCurrentOrders(action: (orders: CurrentOrder[]) => void) {
    this.orderBookContext!.currentOrders$.pipe(
      take(1)
    ).subscribe(action);
  }

  private subscribeToHotkeys() {
    this.orderBookContext?.expendedSettings$?.pipe(
      mapWith(
        () => this.hotkeysService.commands$,
        (settings, command) => ({ settings, command })
      ),
      takeUntil(this.destroy$)
    ).subscribe(({ settings, command }) => {
      if (this.handleCommonCommands(command)) {
        return;
      }

      if (settings.widgetSettings.disableHotkeys) {
        return;
      }

      if (this.handleAllCommands(command)) {
        return;
      }

      if (!this.isActiveOrderBook) {
        return;
      }

      this.handleCurrentOrderBookCommands(command);
    });
  }

  private handleCommonCommands(command: TerminalCommand): boolean {
    if (command.type === ScalperOrderBookCommands.centerOrderBook) {
      ScalperOrderBookTableHelper.alignTable(
        this.table?.cdkVirtualScrollViewport,
        this.tableRowHeight,
        this.orderBookTableData$
      );

      return true;
    }

    return false;
  }

  private handleAllCommands(command: TerminalCommand): boolean {
    if (command.type === ScalperOrderBookCommands.cancelLimitOrdersAll) {
      this.cancelLimitOrders();
      return true;
    }

    if (command.type === ScalperOrderBookCommands.closePositionsByMarketAll) {
      this.closePositionsByMarket();
      return true;
    }

    return false;
  }

  private handleCurrentOrderBookCommands(command: TerminalCommand) {
    if (command.type === ScalperOrderBookCommands.cancelLimitOrdersCurrent) {
      this.cancelLimitOrders();
      return;
    }

    if (command.type === ScalperOrderBookCommands.closePositionsByMarketCurrent) {
      this.closePositionsByMarket();
      return;
    }

    if (command.type === ScalperOrderBookCommands.sellBestOrder) {
      this.placeBestOrder(Side.Sell);
      return;
    }

    if (command.type === ScalperOrderBookCommands.buyBestOrder) {
      this.placeBestOrder(Side.Buy);
      return;
    }

    if (command.type === ScalperOrderBookCommands.sellMarket) {
      this.placeMarketOrderSilent(Side.Sell);
      return;
    }

    if (command.type === ScalperOrderBookCommands.buyMarket) {
      this.placeMarketOrderSilent(Side.Buy);
      return;
    }

    if (command.type === ScalperOrderBookCommands.reversePositionsByMarketCurrent) {
      this.callWithSettings(settings => this.scalperOrdersService.reversePositionsByMarket(settings.widgetSettings));
      return;
    }

    if (/^\d$/.test(command.type)) {
      const index = Number(command.type);
      if (index && index <= this.workingVolumes.length && index > 0) {
        this.selectVol(this.workingVolumes[index - 1]);
      }
    }
  }

  private placeMarketOrderSilent(side: Side) {
    this.callWithSettings(settings => {
      this.callWithWorkingVolume(workingVolume => {
        this.scalperOrdersService.placeMarketOrder(settings.widgetSettings, side, workingVolume, true);
      });
    });
  }

  private closePositionsByMarket() {
    this.callWithSettings(settings => this.scalperOrdersService.closePositionsByMarket(settings.widgetSettings));
  }

  private subscribeToWorkingVolumesChange() {
    this.terminalSettingsService.getSettings().pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged((prev, curr) =>
        prev.hotKeysSettings?.workingVolumes?.length === curr.hotKeysSettings?.workingVolumes?.length),
      withLatestFrom(this.orderBookContext!.expendedSettings$.pipe(take(1))),
    ).subscribe(([terminalSettings, settings]) => {
      this.settingsService.updateSettings(this.guid, {
        workingVolumes: terminalSettings.hotKeysSettings?.workingVolumes
          ?.map((wv, i) => settings.widgetSettings.workingVolumes[i] || 10 ** i)
      });
    });

    this.orderBookContext!.expendedSettings$!.pipe(
      takeUntil(this.destroy$)
    ).subscribe(settings => {
      this.workingVolumes = settings.widgetSettings.workingVolumes;

      if (!this.activeWorkingVolume$.getValue()) {
        this.activeWorkingVolume$.next(this.workingVolumes[0]);
      }
    });
  }

  private placeBestOrder(side: Side) {
    this.callWithSettings(settings => {
      this.callWithCurrentOrderBook(orderBook => {
        this.callWithWorkingVolume(workingVolume => {
          this.scalperOrdersService.placeBestOrder(settings.instrument, side, workingVolume!, orderBook);
        });
      });
    });
  }

  private getVolumeHighlightOption(settings: ScalperOrderBookSettings, volume: number): VolumeHighlightOption | undefined {
    return [...settings.volumeHighlightOptions]
      .sort((a, b) => b.boundary - a.boundary)
      .find(x => volume >= x.boundary);
  }
}

import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { ActiveElement, Chart, ChartEvent, TooltipItem } from "chart.js";
import { TreemapController, TreemapElement } from "chartjs-chart-treemap";
import { TreemapService } from "../../services/treemap.service";
import { debounceTime, map, switchMap } from "rxjs/operators";
import { ThemeService } from "../../../../shared/services/theme.service";
import { TreemapNode } from "../../models/treemap.model";
import { BehaviorSubject, combineLatest, distinctUntilChanged, Observable, take, withLatestFrom } from "rxjs";
import { QuotesService } from "../../../../shared/services/quotes.service";
import { TranslatorService } from "../../../../shared/services/translator.service";

@Component({
  selector: 'ats-treemap[guid]',
  templateUrl: './treemap.component.html',
  styleUrls: ['./treemap.component.less']
})
export class TreemapComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('treemapWrapper') treemapWrapperEl?: ElementRef;
  @Input() guid!: string;
  isCursorOnSector$ = new BehaviorSubject(false);

  private chart?: Chart;
  private selectedSector$ = new BehaviorSubject('');
  private tilesCount$ = new BehaviorSubject(0);
  private maxDayChange = 5;
  private averageTileSize = 4000;

  constructor(
    private readonly treemapService: TreemapService,
    private readonly themeService: ThemeService,
    private readonly quotesService: QuotesService,
    private readonly translatorService: TranslatorService
  ) {
  }

  ngOnInit() {
    Chart.register(TreemapController, TreemapElement);
  }

  ngAfterViewInit() {
    this.tilesCount$.next(
      Math.floor(this.treemapWrapperEl!.nativeElement.clientWidth * this.treemapWrapperEl!.nativeElement.clientHeight / this.averageTileSize)
    );

    const treemap$ = this.tilesCount$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(limit => this.treemapService.getTreemap(limit))
    );

    const ctx = (<HTMLCanvasElement>document.getElementById(this.guid)).getContext('2d')!;

    combineLatest([
      treemap$,
      this.selectedSector$,
      this.themeService.getThemeSettings()
    ])
      .pipe(
        map(([treemap, sector, theme]) => ({
          treemap: treemap
            .filter(t => t.sector.includes(sector))
            .map(t => ({
              ...t,
              dayChangeAbs: Math.abs(t.dayChange)
            })),
          themeColors: theme.themeColors
        })),
      )
      .subscribe(({ treemap, themeColors }) => {
        if (!ctx) {
          return;
        }

        this.chart?.clear();
        this.chart?.destroy();

        this.chart = new Chart(ctx, {
          type: 'treemap',
          data: {
            datasets: [
              {
                tree: treemap,
                key: 'marketCap',
                groups: ['sector', 'symbol'],
                borderWidth: 0,
                spacing: 2,
                captions: {
                  display: true,
                  color: themeColors.chartLabelsColor,
                  font: { weight: '500' }
                },
                labels: {
                  display: true,
                  formatter: (t: any) => [ t.raw._data.symbol, t.raw._data.children[0]?.dayChange + '%' ],
                  overflow: 'fit',
                  color: themeColors.chartLabelsColor,
                  font: [{ weight: '600' }, { weight: '400' }]
                },
                backgroundColor: (t: any) => {
                  if (t.raw?._data.label === t.raw?._data.sector) {
                    return themeColors.chartBackground;
                  } else {
                    return t.raw._data.children[0]?.dayChange > 0
                      ? themeColors.buyColor.replace('1)', `${t.raw._data.children[0]?.dayChangeAbs / this.maxDayChange})`)
                      : themeColors.sellColor.replace('1)', `${t.raw._data.children[0]?.dayChangeAbs / this.maxDayChange})`);
                  }
                },
                borderRadius: 4
              } as any
            ],
          },
          options: {
            onResize: (chart: Chart, { width, height }) => {
              this.tilesCount$.next(Math.floor(width * height / this.averageTileSize));
            },
            onHover: (event: ChartEvent, elements: ActiveElement[]) => {
              this.isCursorOnSector$.next(elements.length === 1);
            },
            color: themeColors.chartLabelsColor,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                displayColors: false,
                callbacks: {
                  label: this.getTooltipLabel,
                  title(tooltipItems: TooltipItem<'treemap'>[]) {
                    return tooltipItems.length > 1
                      ? (tooltipItems[1]!.raw as any)._data.label
                      : (tooltipItems[0]!.raw as any)._data.label;
                  }
                }
              },
            },
            onClick: (event: ChartEvent, elements: ActiveElement[]) => {
              if (elements.length === 1) {
                this.selectedSector$
                  .pipe(
                    take(1)
                  )
                  .subscribe(sector => {
                    if (sector) {
                      this.selectedSector$.next('');
                    } else {
                      this.selectedSector$.next((<any>elements[0].element).$context.raw.g);
                    }
                  });
              }
            }
          }
        });
      });
  }

  ngOnDestroy() {
    this.selectedSector$.complete();
    this.isCursorOnSector$.complete();
  }

  private getTooltipLabel = (tooltipItem: TooltipItem<'treemap'>): string | void => {
    const treemapNode = (tooltipItem.raw as any)._data;

    if (treemapNode.label === treemapNode.sector) {
      return '';
    }

    this.getTooltipData(treemapNode.children[0])
      .pipe(
        take(1)
      )
      .subscribe(data => {
        this.chart!.options.plugins!.tooltip!.callbacks!.label = (newTooltipItem: any): any => {
          if (newTooltipItem.raw._data.label === newTooltipItem.raw._data.sector) {
            return '';
          }

          if (newTooltipItem.raw._data.label === treemapNode.label) {
            return data;
          } else {
            this.getTooltipLabel(newTooltipItem);
          }
        };
        this.chart!.update();
      });
  };

  private getTooltipData(treemapNode: TreemapNode): Observable<string[]> {
    return this.quotesService.getLastQuoteInfo(treemapNode.symbol, 'MOEX')
      .pipe(
        withLatestFrom(
          this.translatorService.getTranslator('treemap')
        ),
        map(([ quote, t ]) => ([
          `${t(['company'])}: ${quote?.description}`,
          `${t(['dayChange'])}: ${treemapNode.dayChange}%`,
          `${t(['marketCap'])}: ${treemapNode.marketCap}`,
          `${t(['lastPrice'])}: ${quote?.last_price}`
        ]))
      );
  }
}
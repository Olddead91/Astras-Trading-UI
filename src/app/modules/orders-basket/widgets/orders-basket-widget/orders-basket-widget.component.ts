import {
  Component,
  Input,
  OnInit
} from '@angular/core';
import { WidgetSettingsService } from '../../../../shared/services/widget-settings.service';
import { DashboardContextService } from '../../../../shared/services/dashboard-context.service';
import { WidgetSettingsCreationHelper } from '../../../../shared/utils/widget-settings/widget-settings-creation-helper';
import { TerminalSettingsService } from '../../../terminal-settings/services/terminal-settings.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SettingsHelper } from '../../../../shared/utils/settings-helper';
import { OrdersBasketSettings } from '../../models/orders-basket-settings.model';
import {WidgetInstance} from "../../../../shared/models/dashboard/dashboard-item.model";

@Component({
  selector: 'ats-orders-basket-widget[widgetInstance][isBlockWidget]',
  templateUrl: './orders-basket-widget.component.html',
  styleUrls: ['./orders-basket-widget.component.less']
})
export class OrdersBasketWidgetComponent implements OnInit {
  @Input()
  widgetInstance!: WidgetInstance;

  @Input()
  isBlockWidget!: boolean;
  settings$!: Observable<OrdersBasketSettings>;
  showBadge$!: Observable<boolean>;
  title$!: Observable<string>;

  constructor(
    private readonly widgetSettingsService: WidgetSettingsService,
    private readonly dashboardContextService: DashboardContextService,
    private readonly terminalSettingsService: TerminalSettingsService
  ) {
  }

  get guid(): string {
    return this.widgetInstance.instance.guid;
  }

  ngOnInit(): void {
    WidgetSettingsCreationHelper.createPortfolioLinkedWidgetSettingsIfMissing<OrdersBasketSettings>(
      this.widgetInstance,
      'OrdersBasketSettings',
      settings => ({
        ...settings
      }),
      this.dashboardContextService,
      this.widgetSettingsService
    );

    this.settings$ = this.widgetSettingsService.getSettings<OrdersBasketSettings>(this.guid);

    this.title$ = this.settings$.pipe(
      map(s => `${s.portfolio} (${s.exchange})`)
    );

    this.showBadge$ = SettingsHelper.showBadge(this.guid, this.widgetSettingsService, this.terminalSettingsService);
  }
}

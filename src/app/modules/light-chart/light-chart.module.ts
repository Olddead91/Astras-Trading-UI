import { NgModule } from '@angular/core';

import { LightChartRoutingModule } from './light-chart-routing.module';
import { LightChartComponent } from './components/light-chart/light-chart.component';
import { LightChartWidgetComponent } from './widgets/light-chart-widget/light-chart-widget.component';
import { LightChartSettingsComponent } from './components/light-chart-settings/light-chart-settings.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { NzInputModule } from 'ng-zorro-antd/input';


@NgModule({
  declarations: [
    LightChartComponent,
    LightChartSettingsComponent,
    LightChartWidgetComponent,
  ],
    imports: [
        SharedModule,
        LightChartRoutingModule,
        NzInputModule
    ],
  exports: [
    LightChartWidgetComponent
  ]
})
export class LightChartModule { }

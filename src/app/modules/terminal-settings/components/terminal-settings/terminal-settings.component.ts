import {
  Component, DestroyRef,
  EventEmitter, Input,
  OnInit,
  Output
} from '@angular/core';
import {
  Observable,
  of,
  take
} from 'rxjs';
import {FullName} from '../../../../shared/models/user/full-name.model';
import {TerminalSettings} from '../../../../shared/models/terminal-settings/terminal-settings.model';
import {
  UntypedFormControl,
  UntypedFormGroup,
  Validators
} from '@angular/forms';
import {ManageDashboardsService} from "../../../../shared/services/manage-dashboards.service";
import {ModalService} from "../../../../shared/services/modal.service";
import {TranslatorService} from "../../../../shared/services/translator.service";
import {AtsValidators} from '../../../../shared/utils/form-validators';
import {TerminalSettingsHelper} from '../../../../shared/utils/terminal-settings-helper';
import {AccountService} from "../../../../shared/services/account.service";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {TerminalSettingsService} from "../../../../shared/services/terminal-settings.service";
import {GeneralSettings, TabNames} from "../../models/terminal-settings.model";

@Component({
  selector: 'ats-terminal-settings',
  templateUrl: './terminal-settings.component.html',
  styleUrls: ['./terminal-settings.component.less']
})
export class TerminalSettingsComponent implements OnInit {
  @Input()
  hiddenSections: string[] = [];

  @Output() formChange = new EventEmitter<{ value: TerminalSettings | null, isInitial: boolean }>();
  @Output() tabChange = new EventEmitter<number>();
  tabNames = TabNames;
  settingsForm?: UntypedFormGroup;
  fullName$: Observable<FullName> = of({
    firstName: '',
    lastName: '',
    secondName: ''
  });

  constructor(
    private readonly accountService: AccountService,
    private readonly terminalSettingsService: TerminalSettingsService,
    private readonly dashboardService: ManageDashboardsService,
    private modal: ModalService,
    private readonly translatorService: TranslatorService,
    private readonly destroyRef: DestroyRef
  ) {
  }

  ngOnInit(): void {
    this.fullName$ = this.accountService.getFullName();
    this.initForm();
  }

  clearDashboard() {
    this.translatorService.getTranslator('terminal-settings')
      .pipe(
        take(1)
      )
      .subscribe(t => {
        this.modal.openConfirmModal({
          nzTitle: t(['hardRebootWarningTitle']),
          nzContent: t(['hardRebootWarningDesc']),
          nzOkText: t(['yesBtnText']),
          nzOkType: 'primary',
          nzOkDanger: true,
          nzOnOk: () => this.terminalSettingsService.reset(),
          nzCancelText: t(['noBtnText']),
          nzOnCancel: () => {
          }
        });
      });
  }

  getFormControl(key: string): UntypedFormControl | null {
    return this.settingsForm?.controls[key] as UntypedFormControl ?? null;
  }

  private initForm() {
    this.terminalSettingsService.getSettings()
      .pipe(
        take(1)
      ).subscribe(settings => {
      this.settingsForm = this.buildForm(settings);

      this.formChange.emit({value: this.formToModel(), isInitial: true});

      this.settingsForm.valueChanges
        .pipe(
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(() => {
          this.formChange.emit({
              value: this.settingsForm?.valid
                ? this.formToModel()!
                : null,
              isInitial: false
            }
          );
        });
    });
  }

  private formToModel(): TerminalSettings | null {
    const formValue = this.settingsForm?.value;
    if (!formValue) {
      return null;
    }

    const model = {
      ...formValue,
      ...formValue.generalSettings
    };

    delete model.generalSettings;

    return model;
  }

  private buildForm(currentSettings: TerminalSettings): UntypedFormGroup {
    return new UntypedFormGroup({
        generalSettings: new UntypedFormControl({
            designSettings: currentSettings.designSettings,
            language: currentSettings.language,
            timezoneDisplayOption: currentSettings.timezoneDisplayOption,
            userIdleDurationMin: currentSettings.userIdleDurationMin,
            badgesBind: currentSettings.badgesBind
          } as GeneralSettings,
          Validators.required),
        portfoliosCurrency: new UntypedFormControl(currentSettings.portfoliosCurrency ?? [], AtsValidators.notNull),
        hotKeysSettings: new UntypedFormControl(currentSettings.hotKeysSettings, Validators.required),
        instantNotificationsSettings: new UntypedFormControl(currentSettings.instantNotificationsSettings, Validators.required),
        scalperOrderBookMouseActions: new UntypedFormControl(
          currentSettings.scalperOrderBookMouseActions ?? TerminalSettingsHelper.getScalperOrderBookMouseActionsScheme1(),
          Validators.required
        ),
      }
    );
  }
}

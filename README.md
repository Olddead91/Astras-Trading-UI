
# Astras – торговое веб-приложение с системой виджетов
<img width="1610" alt="Frame 93" src="https://user-images.githubusercontent.com/115227067/195320972-eecdbf45-cc69-45a3-a756-1a091002762a.png">


# 🔹 Особенности

### Динамическая система виджетов
Увеличивайте, уменьшайте, раздвигайте, добавляйте, в общем делайте то, что хотите.
### Совместимость со всеми рынках
От ценных бумаг до криптовалюты и индексов.
### Интегрированный технический анализ от TradingView
* Неограниченное колличество графиков на одном экране
* 25 индикаторов на одном графике
* 7 основных видов графиков
<img width="1100" alt="Frame 103" src="https://user-images.githubusercontent.com/115227067/195321028-ce360e3f-bfba-4ccf-9dec-73e26e1f34cc.png">


# 🔸 Architecture
Мы расмотрим общую архитектуру (backend+frontend) и архитектуру самого фронтенда

## Whole picture
Для работы терминала необходимо WebSocket-API, а также Http Rest API. Вам необходимо реализовать backend самостоятельно. Спецификация API доступна [тут](https://alor.dev). Для получения часто изменяющихся данных, используется WebSocket  API. Через него передаются такие данные как, например, котировки, сделки, заявки, изменения позиций, средние цены, риск-параметры и так далее. Для данных которые не подразумевают частое изменение, таких как: данные об инструменте, данные о клиенте, справка, авторизация и так далее используется Http API. Авторизация реализована через редирект на SSO и обратно и jwt/refresh токены. В случае если у вас реализована другая система авторизации, вам необходимо отредактировать сервис auth.service. Если ваша схема авторизации такая же, то нужно поменять настройку ssoUrl.

## Front-end part
### Instruments
Терминал использует следующие инструменты.

 - ant-design - дизайн от Ant
 - ng-zorro - библиотека компонентов
 - angular-gridster2 - библиотека для показа виджетов
 - karma + jasmine - тестирование
 - ng2-charts (chart.js) + lightweight-charts + d3 + tradingview(charting_library) - графики и прочая визуализация
 - ngx-markdown - для отображение некоторого контента, типо справки по виджету.
 - ngrx - для управления глобальным состоянием
 - ngx-device-info - для получения информации об устройстве, на котором запущено приложение
 - ngx-joyride - для ознакомления пользователя с ключевым функционалом
 - less - css препроцессор
 - transloco - локализация UI
 - angular-fire - для подключения PUSH-уведомлений через firebase
 - apollo - для запросов через GraphQL
 - pnpm - менеджер пакетов

### Start
Чтобы запустить проект, необходимо установить пакеты

    pnpm install

Запустить

    pnpm start

И пройти по ссылке http://localhost:4200/dashboard


### Project structure
Проект разбит на модули. Каждый виджет выделен в отдельный модуль. Функционал, который может быть использован в разных виджетах, находится в модуле Shared. Через него же осуществляется импорт общих зависимостей. Модуль shared импортируется почти во все виджеты.

Внутри каждого модуля есть 4 основных папки.
 - components - компоненты, которые используются в этом виджете. Они НЕ экспортируются наружу;
 - widgets - компоненты, которые используются из других виджетов. Они экспортируются и используют компоненты из /components как строительные блоки;
 - services - сервисы, которые используются только в этом модуле;
 - models - модели, которые используются только в этом модуле.

Так же есть дополнительные
 - utils - вспомогательный код, который используется только в этом модуле;
 - pages - если наш модуль не является виджетом, а является полноценной страницей со своим роутингом.

Поподробней расмотрим структуру shared модуля. Если вам необходимо добавить какую-либо angular сущность, то скорее всего это лучше сделать именно в shared модуле. Пример: interceptors, guards, pipes. Если вам нужно добавить какой-либо визуальный компонент, импорт скорее всего лучше сделать из shared модуля, ведь вряд ли этот компонент будет использоваться только в одном единственном модуле.

Отдельно выделен store модуль. Он содержит определения частей ([feature](https://ngrx.io/guide/store/feature-creators)) глобального состояния в терминах ngrx. Модуль store уже импортирован в shared.
Для каждой части глобального состояния необходимо создавать свою папку, которая содержит файлы с определениями actions, reducers, effects и selectors.

Другим важным модулем является dashboard.
Это основной модуль, который клиенты видят. Именно тут они работают с терминалом. Именно тут они торгуют, смотрят графики, добавляют новые виджеты и так далее. В нём мы используем все остальные компоненты и именно на него прописан основной маршрут. Данный модуль адаптирован для работы на desktop и mobile устройствах.

Также проект содержит папку build-specifics с файлами ext-modules.ts и ext-modules.prod.ts. Данные файлы позволяют подключать функционал, наличие которого зависит от текущей конфигурации, используемой при сборке (development или production). 
Так в ext-modules.ts следует перечислять модули, которые должны быть доступны только в development конфирурации, например, dev tools. А в ext-modules.prod.ts - модули, доступные только в production. Обратите внимание, что содержимое данных файлов заменяется одно на другое, а не мержится.

### Routing
На данный момент существует только один основной маршрут /dashboard. В зависимости от типа устройства, на котором запускается приложение, данный маршрут автоматически будет изменен на /dashboard/mobile для загрузки версии, адаптированной для mobile устройств.

### Общие компоненты

В shared-модуле находятся общие компоненты, которые используются в разных местах приложения. Рассмотрим основные из них:
 - widget-header - общий скелет заголовка виджета с наименованием, кнопками справки, настроек, удаления виджета и т.д.;
 - widget-header-instrument-switch общий скелет заголовка виджета с функцией смены инструмента прямо через заголовок;
 - widget-settings - общий скелет настроек виджета с кнопками копирования виджета (если есть такая возможность) и сохранения настроек;
 - widget-skeleton - общий скелет виджета с заголовком, контентом виджета и его настройками;
 - base-table и lazy-loading-base-table - базовые классы для компонентов с обычными таблицами и таблицами с ленвой подгрузкой данных;
 - infinite-scroll-table - общий компонент для отображения таблицы с ленивой подгрузкой данных
 - instrument-search - автокомплит для поиска и выбора инструментов;
 - instrument-board-select - селект для выбора режима торгов инструмента;
 - instrument-badge-display и merged-badge - компонент для отображения бейджа у инструмента;
 - input-number - поле ввода числа. Принимает параметры числа и валидирует введённое значение, имеет обработку клавиш "ВВЕРХ" и "ВНИЗ" клавиатуры, а так же скролла;

### Key services
Опишем сервисы, которые считаем ключевыми в приложении. Все они находятся в модуле shared в папке services
 - AuthService - сервис, специфичный для каждого проекта. Реализует логику авторизации и получения токена для последующей работы с бэкендом;
 - DashboardContextService - сервис, который позволяет получать информацию о текущем активном дашборде, выбранных на нем портфеле и инструментах;
 - ErrorHandlerService - глобальный обработчик ошибок ([ErrorHandler](https://angular.io/api/core/ErrorHandler)). Перехватывая ошибки, данный сервис делегирует их обработку зарегистрированным обработчикам: HttpErrorHandler и LogErrorHandler;
 - LoggerService - сервис логгирования. Используется в компонентах и сервисах. Делегирует запись логов зарегистрированным логгерам. На текущий момент логи записываются в консоль браузера (ConsoleLogger) и на сервер Elasticsearch (RemoteLogger);
 - ManageDashboardsService - сервис для управления коллекцией дашбордов, а также виджетами текущего дашборда;
 - SubscriptionsDataFeedService - сервис через который проходит работа с Websocket API;
 - WidgetSettingsService - сервис для управления настройками виджетов;
 - AuthInterceptor - сервис который подставляет свежий токен во все http запросы.
 - EnvironmentService - сервис для получения данных окружения

### Стили
В проекте используется less. Глобальные стили добавляются в styles.less.  

В проекте реализованы две цветовые схемы: dark и light. Переменные и стили, специфичные для цветовой схемы, следует добавлять в файлы dark.less и default.less, расположенные в папке /src/styles/themes.
При необходимости получить variables цветовой схемы или variables/mixins из библиотеки компонентов ng-zorro, например @primary-color и другие, нужно использовать themeMixin.

Общие стили, используемые разными компонентами, следует оформлять в виде mixins. Mixin должен быть расположен в папке styles/mixins.

Общие вспомогательные стили (utils) или кастомные стили для компонентов ng-zorro следует оформлять в виде отдельных файлов в папках /src/styles/utils и /src/styles/components соответственно. Все такие файлы должны быть импортированы в styles.less.



### Environment настройки
 - apiUrl: - API для торгового API, пример 'https://api.alor.ru',
 - wsUrl: - Websocket URL, пример 'wss://api.alor.ru/ws',
 - clientDataUrl: - Api для получения данных по клиенту, 'https://lk-api.alor.ru',
 - ssoUrl: - адрес редиректа для sso 'https://login.alor.ru',
 - warpUrl: -  Api для получения данных о релизах 'https://warp.alor.dev',
 - remoteSettingsStorageUrl: -  Api для хранения настроек пользователя 'https://astras-dev.alor.ru/identity/v5/UserSettings',
 - teamlyDatabaseUrl: адрес для получения ссылок на справку виджетов,
 - logging: настройки логгирования (опциональные)
   - console: настройки логов, записываемых в консоль браузера (опциональные - если данная секция отсутствует, то логи в консоль не записываются)
     - minLevel: минимальный уровень записываемых логов (доступные значения в порядке повышения уровня: 'trace', 'info', 'warn', 'error')
   - remote: настройки логов, записываемых в elastic (опциональные - если данная секция отсутствует, то логи в Elasticsearch не записываются)
     - minLevel: минимальный уровень записываемых логов (доступные значения в порядке повышения уровня: 'trace', 'info', 'warn', 'error')
     - environment: метка окружения, на котором развернуто приложение ('prod' - боевое окружение, 'dev' - dev-контур, 'local' - локальное окружение)
     - loggingServerUrl: адрес сервера elastic 'https://astras-dev.alor.ru/eslogs'
     - authorization: настройки авторизации Elasticsearch (заполняются CI/CD)
       - name: имя пользователя
       - password: пароль
 - firebase: настройки сервера push-уведомлений,
 - externalLinks: список статических ссылок на вшешние ресурсы.

### Конфигурация бирж
Файл **assets/marketSettings.json** позволяет настроить список бирж, с которыми работает приложение, а также указать некоторые аспекты, необходимые при отображении информации и формировании запросов к API.
В данном файле должно быть отмечено какая из бирж является биржей по умолчанию и какой инструмент должен быть выбран при первом запуске (сбросе настроек) приложения пользователем.

### Конфигурация виджетов
Файл **assets/widgets-meta.json** содержит список всех доступных в приложении виджетов.
Для каждого виджета в данном списке указана служебная информация (typeId и definition), **которая не должна изменяться**, и настройки отображения (widgetName, icons).

При удалении виджета из данного списка он перестанет отображаться в меню виджетов, а также на дашборде (даже если был добавлен ранее).

Чтобы скрыть виджет только в меню виджетов desktop версии, нужно указать значение false для параметра desktopMeta.enabled.

Чтобы скрыть виджет только в mobile версии, нужно указать значение false для параметра mobileMeta.enabled. Отсутсвие секции mobileMeta говорит о том, что виджет для mobile версии не применяется.
Аналогично осутствие секции desktopMeta означает, что виджет не применим для desktop.

**ВАЖНО:** при добавлении нового виджета в приложение он должен быть описан в данном файле.

### Конфигурация дашборда по умолчанию
Дашборд по умолчанию отображается:
- при первом запуске
- при нажатии на кнопку Виджеты->Стандартный вид
- при сбросе настроек терминала
- в мобильной версии

Набор, расположение и порядок следования (в мобильной версии) виджетов определяется в файле **assets/default-dashboard-config.json**.
Данный файл содержит раздельные настройки для desktop и mobile версий.

**ВАЖНО**: если какой-либо виджет отключен на desktop версии (см. предыдущую секцию), то его следует также убрать из конфигурации desktop дашборда, иначе при сбросе он будет появляться у пользователя.

### Internationalization

В проекте используется библиотека transloco для интернационализации текста. Чтобы подключить новый язык переводов, необходимо описать его в *transloco-root.module.ts*, а так же в *assets/i18n* и всех вложенных директориях добавить JSON-файл именнованый, как язык, который был описан в *transloco-root.module.ts*, в котором будут описаны переводы. Для того, чтобы использовать переводы, описанные в *assets/i18n* в шаблонах компонентов, необходимо подключить структурную директиву *transloco с описанным scope при вложенности директорий (например *\*transloco="let t; scope: 'blotter/settings'"*), а затем описанную функцию, которая принимает строку с ключевым словом из JSON-файлов переводов, включая scope, перобразованный к camelCase (например, учитывая scope из прошлого примера: *\<p>{{ t('blotterSettings.portfolioLabel') }}\</p>*). Чтобы использовать переводы внутри классов компонентов, был создан TranslatorService, в котором есть методы получения/изменения языка, а так же метод getTranslator, который принимает строку с scope и возвращает Observable с функцией, которая принимает массив строк ключей (для вложенных полей из JSON-файла переводов) и возвращает перевод по этим ключам.

### PUSH-уведомления

Для показывания PUSH-уведомлений необходимо в файле *firebase-messaging-sw.js* исправить конфиг firebase на свой, а так же, при енобходимости, описать свою обработку сообщения в коллбеке *messaging.onBackgroundMessage*. Так же, для показывания firebase-уведомлений ng-zorro внутри приложения необходимо в environment исправить конфиг firebase на свой, и поправить обработку сообщений при необходимости в *modules/push-notifications/services/push-notifications-provider.ts*.

### GraphQL

В некоторых сервисах для получения данных используется GraphQL API. Для таких запросов в проект была добавлена библиотека apollo-angular. Настроить url отправки запроса и прочие конфигурации можно в *graphql.module.ts*. В *shared/services* был добавлен сервис *GraphQlService*, в котором есть метод *watchQuery*, принимающий строку запроса, переменные и дополнительные опции (такие, как сохранение кэша). На бэкенде используется фреймворк [chillicream](https://chillicream.com/docs/hotchocolate/v13/fetching-data). С более подробной информацией, как пользоваться GraphQL, вы можете ознакомиться [здесь](https://graphql.org/learn/).

### Тестирование
Самый мимимум, который должен быть в каждом компоненте и сервисе, это тест на успешное создание компонента. Он создается ng generate по умочанию, но необходимо поддерживать, добавлять моки и стабы для input и используемых сервисов. В **shared/utils/testing.ts** есть интрументы для создания моков компонентов, рандомных данных, а так же моки основных компонентов ng-zorro и модулей. В ключевых сервисах, покрытие тестами выше. Ну ладно, будет. В планах это есть, точно =)

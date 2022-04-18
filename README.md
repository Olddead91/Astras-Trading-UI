
# Astras `Alpha version`
Торговый терминал на Angular от Алор Брокер.

![image](https://user-images.githubusercontent.com/6408195/154630168-1d8c45fb-deb9-46c6-a4a6-83dd2900d352.png)


# Architecture `todo: translate`
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
 - ng2-charts (chart.js) + lightweight-charts - графики
 - ngx-markdown - для отображение некоторого контента, типо справки по виджету.
 - ngrx - для управления глобальным состоянием
 - less - css препроцессор
 - yarn - менеджер пакетов

### Start
Чтобы запустить проект, необходимо установить пакеты

    yarn install

Запустить

    yarn start

И пройти по ссылке http://localhost:4200/dashboard


### Project structure
Проект разбит на модули. Каждый виджет выделен в отдельный модуль. Функционал, который может быть использован в разных виджетах, находится в модуле Shared. Через него же осуществляется импорт общих зависимостей. Модуль shared импортируется почти во все виджеты.

Внутри каждого модуля есть 4 основных папки.
 - components - компоненты, которые используются в этом виджете. Они НЕ импортируются наружу.
 - widgets - компоненты, которые используются из других виджетов. Они импортируются и используют компоненты из /components как строительные блоки
 - services - сервисы, которые используются только в этом модуле
 - models - модели, которые используются только в этом модуле.

Так же есть дополнительные
 - utils - вспомогательный код, который используется только в этом подуле.
 - pages - если наш модуль не является виджетом, а является полноценной страницей со своим роутингом

Поподробней расмотрим структуру shared модуля. Если вам необходимо добавить какую-либо angular сущность, то скорее всего это лучше сделать именно в shared модуле. Пример: interceptors, guards, pipes. Если вам нужно добавить какой-либо визуальный компонент, импорт скорее всего лучше сделать из shared модуля, ведь вряд ли этот компонент будет использоваться только в одном единственном модуле.

Отдельно выделен store модуль. Он содержит определения частей ([feature](https://ngrx.io/guide/store/feature-creators)) глобального состояния в терминах ngrx. Модуль store уже импортирован в shared.
Для каждой части глобального состояния необходимо создавать свою папку, которая содержит файлы с определениями actions, reducers, effects и selectors.

Другим важным модулем является dashboard.
Это основной модуль, который клиенты видят. Именно тут они работают с терминалом. Именно тут они торгуют, смотртят графики, добавляют новые виджеты и так далее. В нём мы используем все остальные компоненты и именно на него прописан основной маршрут.

Также проект содержит папку build-specifics с файлами ext-modules.ts и ext-modules.prod.ts. Данные файлы позволяют подключать функционал, наличие которого зависит от текущей конфигурации, используемой при сборке (development или production). 
Так в ext-modules.ts следует перечислять модули, которые должны быть доступны только в development конфирурации, например, dev tools. А в ext-modules.prod.ts - модули, доступные только в production. Обратите внимание, что содержимое данных файлов заменяется одно на другое, а не мержится.

### Routing
На данный момент существует только один основной маршрут /dashboard

### Key services
Опишем сервисы, которые считаем ключевыми в приложении. Все они находятся в модуле shared в папке services
 - Base - базовый сервис, от которого наследуются почти все остальные сервисы для виджетов. Содержит в себе работу с настройками.
 - Websocket - сервис через который проходит работа с Websocket API. Используется во всех сервисах, которые слушают веб-сокеты, через расширение BaseWebsocket сервиса. 
 - BaseWebsocket - содержит методы для получения сущностей по вебсокетам. Использует Websocket. Наследуется всеми сервисами, которые работают с вебсокетами.
 - GlobalErrorHandlerService - глобальный обработчик ошибок ([ErrorHandler](https://angular.io/api/core/ErrorHandler)). Перехватывая ошибки, данный сервис делегирует их обработку зарегистрированным обработчикам: HttpErrorHandler и LogErrorHandler.
 - AuthService - сервис специфичный для каждого проекта. Реализует логику авторизации и получения токена, для последующей работы с бэкендом.
 - AuthInterceptor - сервис который подставляет свежий токен во все http запросы
 - Dashboard - сервис который хранит информацию по виджетам, позволяет добавлять новые виджеты, удалять существующие с доски, сохранять доску в память и так далее. Для создание виджетов используется WidgetFactoryService
 - WidgetFactory - сервис в котором реализована логика создания новых виджетов и инициализация их настроек по умолчанию.
 - LoggerService - сервис логгирования. На текущий момент логгирование реализовано средствами console объекта.

### Стили
В проекте используется less. Общие стили и переменные добавляются в styles.less.  
При необходимости получить общие стили (mixins, variables) или стили из библиотеки компонентов ng-zorro, например @primary-color и другие, нужно импортировать стили вот так @import (reference) '/src/styles.less'; Если при прод сборке ругается на то, что css файлы слишком большие, то скорее всего вы импортировали стили неправильно.  
Общие переменные для цветов следует размещать в файле styles/colors.less.  
Общие стили, используемые разными компонентами, следует оформлять в виде mixins. Mixin должен быть расположен в папке styles/mixins и импортирован в файле styles/mixins/index.less.


### Environment настройки
 - apiUrl: - API для торгового API, пример 'https://api.alor.ru',
 - wsUrl: - Websocket URL, пример 'wss://api.alor.ru/ws',
 - clientDataUrl: - Api для получения данных по клиенту, 'https://lk-api.alor.ru',
 - ssoUrl: - адрес редиректа для sso 'https://login.alor.ru'

### Тестирование
Самый мимимум который должен быть в каждом компоненте и сервисе, это тест на успешное создание компонента. Он создается ng generate по умочанию, но необходимо поддерживать, добавлять моки и стабы для input и используемых сервисов. В ключевых сервисах, покрытие тестами выше. Ну ладно, будет. В планах это есть, точно =)

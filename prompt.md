Bạn là một Senior Game Engineer, Full-stack Engineer, Game Designer và Software Architect.

Nhiệm vụ của bạn là **research, thiết kế và xây dựng một prototype hoàn chỉnh có thể chơi được** cho một game web multiplayer mô phỏng cuộc sống, kinh doanh và làm giàu.

Không chỉ tạo UI mockup. Hãy tạo một **game thực sự có gameplay loop và có thể chơi được trên cả desktop lẫn mobile browser**.

# 1. Ý TƯỞNG CỐT LÕI

Game xoay quanh câu hỏi:

> “Nếu bạn được ban cho một số tiền đủ lớn, bạn sẽ làm gì để tạo ra thêm tiền và trở nên giàu có hơn?”

Người chơi bắt đầu với một lượng tiền nhất định.

Ví dụ:

STARTING_BALANCE = 100,000

Đơn vị tiền tạm thời có thể là `$` hoặc một game currency riêng.

Không tồn tại một con đường duy nhất để chiến thắng.

Người chơi phải tự quyết định:

- tiêu tiền
- tiết kiệm
- đầu tư
- buôn bán
- mở cửa hàng
- thành lập doanh nghiệp
- mua tài sản
- hợp tác với người khác
- cạnh tranh với người khác

Mục tiêu dài hạn là xây dựng tài sản và tạo ra nhiều dòng thu nhập khác nhau.

Game phải khiến người chơi cảm thấy:

“Đây là một xã hội thu nhỏ mà mình có thể tự lựa chọn cách kiếm tiền.”

---

# 2. PHONG CÁCH GAME

Game là:

- 2D
- top-down hoặc 2.5D/isometric nếu phù hợp
- cartoon
- chibi
- cute
- colorful
- cozy
- sinh động

Tham khảo cảm giác hình ảnh và gameplay từ các thể loại:

- Stardew Valley
- Animal Crossing
- Habbo
- MapleStory social areas
- The Sims
- tycoon games
- business simulation games
- social MMO games

KHÔNG sao chép asset, nhân vật, UI hay IP của các game trên.

Chỉ sử dụng chúng như nguồn tham khảo về game design.

Thế giới cần tạo cảm giác:

- thân thiện
- đông vui
- dễ khám phá
- có nhiều thứ để tương tác
- luôn có hoạt động diễn ra

---

# 3. GAME WORLD

Prototype đầu tiên cần có ít nhất một khu vực thành phố nhỏ.

Ví dụ:

Town / Downtown District

Bao gồm:

- đường phố
- vỉa hè
- cây xanh
- công viên
- nhà dân
- cửa hàng
- cafe
- supermarket
- bank
- office building
- marketplace
- empty commercial buildings
- NPC

Player có thể di chuyển tự do trong khu vực này.

Desktop:

- WASD
- arrow keys
- mouse interaction

Mobile:

- virtual joystick
- touch interaction
- responsive UI

Camera đi theo player.

---

# 4. HỆ THỐNG THỜI GIAN

Game phải có game clock riêng.

Ví dụ:

1 ngày trong game = khoảng 20–30 phút ngoài đời.

Hiển thị:

- giờ
- phút
- ngày
- thứ
- thời tiết

Ví dụ:

Monday
08:35 AM
24°C
Sunny

Game có:

Morning  
Afternoon  
Evening  
Night

Ánh sáng môi trường thay đổi dần theo thời gian.

Ví dụ:

05:00 → sunrise  
08:00 → daylight  
17:30 → sunset  
20:00 → night

Không chuyển màu đột ngột.

Sử dụng smooth transition.

---

# 5. HỆ THỐNG NGÀY / ĐÊM

Thành phố phải thay đổi theo thời gian.

Ban ngày:

- đông NPC
- nhiều cửa hàng mở
- ánh sáng sáng
- giao thông nhiều hơn

Ban đêm:

- đèn đường bật
- cửa hàng bật biển hiệu
- một số cửa hàng đóng cửa
- ít NPC hơn
- một số hoạt động nightlife xuất hiện

Lighting system phải được thiết kế tách biệt để sau này có thể mở rộng.

---

# 6. HỆ THỐNG THỜI TIẾT

Tạo WeatherManager.

Prototype hỗ trợ ít nhất:

Sunny

Cloudy

Rain

Weather ảnh hưởng trực tiếp đến thế giới.

Ví dụ:

Rain:

- trời tối hơn
- hiệu ứng mưa
- NPC có thể cầm ô
- lượng khách đi bộ giảm
- một số loại cửa hàng bán tốt hơn hoặc kém hơn

Sunny:

- nhiều NPC ngoài đường
- công viên đông hơn
- cửa hàng đồ uống có thể có nhiều khách hơn

Cloudy:

- trạng thái trung gian

Thiết kế architecture để sau này bổ sung:

- storm
- snow
- heatwave
- fog

Temperature cũng phải tồn tại.

Ví dụ:

28°C

Nhiệt độ có thể liên quan đến:

- thời tiết
- thời gian trong ngày

---

# 7. NPC SYSTEM

Thành phố phải có nhiều NPC chibi đi lại.

Không để NPC chỉ đứng yên.

NPC cần:

- walk
- idle
- stop
- enter building
- leave building
- sit
- shop
- talk
- wander

Không cần AI phức tạp trong prototype.

Có thể sử dụng:

Finite State Machine

Ví dụ:

IDLE  
WALKING  
SHOPPING  
WORKING  
GOING_HOME  

NPC có schedule cơ bản.

Ví dụ:

07:00 leave home

08:00 go to work

12:00 lunch

17:00 leave office

18:00 shop

20:00 go home

Không cần tất cả NPC có schedule riêng.

Có thể tạo archetype:

OfficeWorker

Student

Shopper

Tourist

Resident

NPC movement phải nhẹ và tối ưu.

Không tạo hàng trăm entity update logic nặng mỗi frame.

---

# 8. PLAYER SYSTEM

Player có:

id

username

avatar

position

cash

bankBalance

netWorth

inventory

properties

businesses

skills

Player có thể:

- đi bộ
- tương tác NPC
- tương tác cửa hàng
- mua item
- bán item
- xem inventory
- xem số tiền
- gửi tiền vào bank
- rút tiền
- đầu tư
- sở hữu business
- giao dịch

Tạo UI HUD hiển thị:

Avatar

Cash

Bank balance

Net worth

Current time

Weather

Temperature

---

# 9. GAMEPLAY LOOP

Core loop:

Receive capital
↓
Explore city
↓
Find opportunities
↓
Spend / invest money
↓
Generate income
↓
Reinvest
↓
Build businesses
↓
Increase net worth
↓
Unlock larger opportunities

Player không nên chỉ click một nút “make money”.

Phải có nhiều chiến lược.

---

# 10. CÁC CÁCH KIẾM TIỀN

Prototype chưa cần triển khai tất cả nhưng architecture phải hỗ trợ.

### Jobs

Ví dụ:

delivery

cashier

office job

freelance

Part-time job tạo active income.

---

### Trading

Người chơi có thể mua item giá thấp và bán lại.

Ví dụ:

Coffee beans

Electronics

Food

Clothing

Raw materials

Collectibles

Item structure:

Item

id

name

category

basePrice

marketPrice

rarity

description

icon

---

### Marketplace

Tạo marketplace cho phép player:

create listing

set price

set quantity

buy listing

cancel listing

Transaction phải được validate phía server/database.

Không tin dữ liệu money gửi từ client.

---

# 11. PLAYER-TO-PLAYER ECONOMY

Game về lâu dài phải hỗ trợ economy giữa người chơi.

Player có thể:

- mua hàng của player khác
- bán hàng cho player khác
- mua nguyên liệu
- cung cấp nguyên liệu
- thuê dịch vụ
- hợp tác kinh doanh

Prototype cần tạo ít nhất hệ thống:

Marketplace listing.

Ví dụ:

Player A:

100 Coffee Beans

Price:
$8 each

Player B có thể mua.

Sau khi transaction:

Player A nhận tiền.

Player B nhận Coffee Beans.

Marketplace phải đảm bảo transaction atomic.

Không thể:

duplicate items

duplicate money

buy cùng một listing hai lần khi stock đã hết

---

# 12. SHOP SYSTEM

Player có thể thuê hoặc mua một commercial property.

Sau đó mở shop.

Ví dụ:

Coffee Shop

Grocery Store

Clothing Shop

Electronics Store

Prototype chỉ cần implement sâu một loại:

Coffee Shop

Flow:

rent property

↓

choose business type

↓

purchase equipment

↓

purchase inventory

↓

set product prices

↓

open store

↓

NPC customers visit

↓

sales generated

↓

expenses deducted

↓

profit calculated

---

# 13. BUSINESS SYSTEM

Business entity cần có:

id

ownerId

businessType

businessName

level

cash

revenue

expenses

profit

inventory

employees

location

reputation

customerTraffic

Player có thể:

Open Business

Close Business

Set Prices

Buy Inventory

Upgrade Business

View Financial Report

---

# 14. BUSINESS FINANCE

Hiển thị dashboard đơn giản:

Revenue

COGS

Salary

Rent

Utility

Profit

Ví dụ:

Revenue: $4,200

Inventory cost: -$1,300

Rent: -$500

Salary: -$800

----------------

Profit: $1,600

Mục tiêu là giúp player hiểu:

Revenue != Profit.

---

# 15. NPC CUSTOMER SIMULATION

NPC customer có thể quyết định mua hàng dựa trên:

Price

Store reputation

Distance

Weather

Product availability

Ví dụ:

purchaseProbability =

baseDemand

× priceFactor

× reputationFactor

× weatherFactor

Không cần mô hình kinh tế phức tạp.

Ưu tiên gameplay dễ hiểu.

---

# 16. ECONOMY SYSTEM

Tạo EconomyManager.

Market price không nên hoàn toàn random.

Giá có thể dựa trên:

base price

supply

demand

random variation nhỏ

world events

Ví dụ:

Coffee Bean

Base price = 10

Supply cao

↓

price = 8.5

Demand cao

↓

price = 12

Cần thiết kế để sau này có thể mở rộng economy simulation.

---

# 17. NET WORTH

Net worth của player:

cash

+

bank balance

+

inventory value

+

property value

+

business valuation

+

investment value

Net Worth phải được hiển thị nổi bật.

Đây là một chỉ số tiến triển của game nhưng không phải “điểm chiến thắng” duy nhất.

---

# 18. REAL ESTATE

Architecture chuẩn bị cho:

rent apartment

rent shop

buy house

buy shop

buy land

buy office

Prototype chỉ cần:

1 apartment

1 commercial property

Commercial property phải có bảng:

FOR RENT

Player tương tác để thuê.

---

# 19. BANK

Tạo Bank building.

Player có thể:

Deposit

Withdraw

View balance

Architecture chuẩn bị cho tương lai:

Loan

Mortgage

Credit score

Interest

Business loan

Investment products

Prototype chưa cần implement tất cả.

---

# 20. RANDOM EVENTS

Tạo EventManager.

Ví dụ:

“Coffee bean shortage”

Coffee bean price:

+25%

Duration:

2 game days

Ví dụ khác:

“Heatwave”

Cold drinks demand:

+40%

Hoặc:

“Local festival”

Downtown customer traffic:

+50%

World events phải tạo cảm giác economy đang sống.

---

# 21. MULTIPLAYER

Game được thiết kế theo multiplayer architecture.

Player có thể nhìn thấy player khác trong town.

Sync:

player position

player direction

player animation

player name

Không sync mọi frame một cách ngây thơ.

Sử dụng:

interpolation

rate limiting

state synchronization

Server phải là authoritative source cho những thông tin quan trọng như:

money

inventory

transactions

business ownership

marketplace

Không cho client tự quyết định số tiền.

---

# 22. PLAYER PRESENCE

Hiển thị:

online players

their avatars

their names

their movement

Nếu player disconnect:

remove avatar khỏi world.

Nếu reconnect:

restore persistent account state.

---

# 23. AUTHENTICATION

Implement:

Register

Login

Logout

Persistent session

Profile

Prototype có thể dùng:

Supabase Auth.

---

# 24. DATABASE

Ưu tiên:

PostgreSQL / Supabase.

Schema gợi ý:

profiles

player_wallets

inventories

inventory_items

items

marketplace_listings

marketplace_transactions

properties

businesses

business_inventory

business_transactions

world_events

player_stats

Database cần:

foreign keys

indexes

constraints

timestamps

transactions

Row Level Security nếu dùng Supabase.

Không để player A sửa wallet của player B trực tiếp từ client.

---

# 25. REALTIME ARCHITECTURE

Suggested prototype stack:

Frontend:

React
TypeScript
Vite

Game:

Phaser

Backend persistence:

Supabase

Database:

PostgreSQL

Authentication:

Supabase Auth

Realtime persistent events:

Supabase Realtime

Real-time game world:

Colyseus

Styling:

TailwindCSS

State management:

Zustand

Có thể điều chỉnh stack nếu sau quá trình research bạn tìm thấy giải pháp tốt hơn.

Nhưng phải giải thích rõ lý do trước khi thay đổi.

---

# 26. PROJECT STRUCTURE

Không đặt toàn bộ game trong một file.

Tách cấu trúc rõ ràng.

Ví dụ:

src/

game/

scenes/

BootScene

TownScene

UIScene

systems/

TimeManager

WeatherManager

EconomyManager

NPCManager

BusinessManager

MarketplaceManager

entities/

Player

NPC

Building

Shop

Business

ui/

components/

hooks/

stores/

services/

api/

types/

assets/

server/

rooms/

schemas/

services/

database/

Mỗi system chỉ chịu trách nhiệm một nhóm logic.

---

# 27. GAME ARCHITECTURE

Ưu tiên:

Event-driven architecture.

Ví dụ:

TIME_CHANGED

WEATHER_CHANGED

PLAYER_MONEY_CHANGED

BUSINESS_OPENED

MARKET_PRICE_CHANGED

WORLD_EVENT_STARTED

Systems không nên phụ thuộc chặt vào nhau.

Ví dụ:

WeatherManager không gọi trực tiếp ShopManager.

WeatherManager emit:

WEATHER_CHANGED

Shop system subscribe event.

---

# 28. ART STYLE

Toàn bộ world phải có phong cách nhất quán:

Cute chibi

Pastel

Bright

Modern town

Rounded shapes

Soft shadows

Warm atmosphere

Nhân vật:

đầu hơi lớn

thân nhỏ

animation vui nhộn

Mọi NPC không được giống hệt nhau.

Randomize:

hair

shirt

pants

skin tone

accessories

color palette

---

# 29. ASSET STRATEGY

Prototype có thể sử dụng:

- open-source assets
- CC0 assets
- generated placeholder assets
- simple procedural graphics

Nhưng:

KHÔNG sử dụng copyrighted game assets.

Tạo:

ASSETS.md

Trong đó ghi:

asset

source

license

author

usage

Nếu không tìm được asset phù hợp:

hãy tự tạo placeholder bằng simple sprite/vector/procedural graphics.

Gameplay quan trọng hơn graphics ở prototype.

---

# 30. RESPONSIVE DESIGN

Desktop:

Landscape layout.

Mobile:

Portrait hoặc landscape adaptive.

UI không được tràn màn hình.

Mobile controls:

virtual joystick

interaction button

menu button

Không phụ thuộc hover interaction.

Touch target tối thiểu phải dễ nhấn.

---

# 31. PERFORMANCE

Target:

60 FPS desktop.

30–60 FPS mobile.

Không update NPC logic nặng ở mỗi frame.

Sử dụng:

object pooling nếu cần

distance-based updates

NPC sleep/culling

texture atlas

lazy asset loading

Không render entity ngoài camera nếu không cần.

---

# 32. SAVE SYSTEM

Player data phải persistent.

Nếu refresh browser:

player giữ:

money

inventory

businesses

properties

progression

Không lưu economy-sensitive values chỉ trong localStorage.

LocalStorage chỉ dùng cho:

settings

graphics preference

audio volume

temporary cache

---

# 33. ANTI-CHEAT FOUNDATION

Các action sau phải validate server-side:

buy item

sell item

marketplace transaction

business purchase

property purchase

wallet update

income reward

Client không bao giờ được gửi:

“setMoney = 999999999”

Client chỉ gửi intent.

Ví dụ:

BUY_ITEM

itemId

quantity

Server tính:

price

cost

inventory

balance

và quyết định transaction có hợp lệ hay không.

---

# 34. FIRST PROTOTYPE SCOPE

Đây là phần RẤT QUAN TRỌNG.

Không cố implement toàn bộ ý tưởng cùng lúc.

Prototype V1 chỉ cần tạo một vertical slice hoàn chỉnh.

Phải implement:

### World

1 town map

roads

sidewalk

buildings

park

bank

coffee shop

commercial property

marketplace

---

### Player

movement

animation

collision

interaction

wallet

inventory

net worth

---

### NPC

20–30 NPC

walking

idle

basic schedule

shop interaction

---

### Simulation

time

day/night

weather

temperature

NPC traffic variation

---

### Economy

items

buy

sell

dynamic price

inventory

---

### Business

player thuê shop

mở coffee shop

mua coffee beans

set coffee price

NPC mua coffee

revenue

expenses

profit

---

### Marketplace

create listing

buy listing

cancel listing

---

### Multiplayer

ít nhất 2 browser tabs / 2 clients có thể:

login bằng account khác nhau

enter same town

see each other

move around

see position updates

---

# 35. DEMO FLOW

Prototype phải hỗ trợ demo sau:

Player đăng ký account.

↓

Player spawn trong town với:

$100,000.

↓

Player đi quanh thành phố.

↓

Thấy NPC đang di chuyển.

↓

Thời gian và thời tiết thay đổi.

↓

Player đến marketplace.

↓

Mua Coffee Beans.

↓

Player đến một commercial building.

↓

Thuê mặt bằng.

↓

Mở:

“Dat Coffee”

↓

Mua equipment.

↓

Đặt giá coffee:

$5.

↓

Open Store.

↓

NPC bắt đầu tới.

↓

Coffee Beans giảm.

↓

Revenue tăng.

↓

Profit dashboard update.

↓

Player tạo marketplace listing:

Coffee Beans

20 units

$9/unit.

↓

Một account khác mua listing.

↓

Money/inventory của cả hai account thay đổi.

Đây phải là một flow chơi được end-to-end.

---

# 36. UI

HUD cần minimal và không che game.

Desktop example:

Top-left:

Player

Money

Bank

Net Worth

Top-center:

Day

Time

Weather

Temperature

Bottom:

Inventory

Business

Market

Phone/Menu

Interaction popup:

Press E

hoặc:

Tap to interact

---

# 37. IN-GAME PHONE

Tạo smartphone icon.

Click mở menu.

Apps:

Bank

Marketplace

Business

Inventory

Profile

Map

Prototype không cần mô phỏng smartphone quá phức tạp.

Chỉ dùng như navigation system.

---

# 38. DEBUG PANEL

Development mode cần debug panel.

Có thể:

change time

change weather

give test money

spawn NPC

trigger world event

inspect FPS

Debug commands không được hoạt động trong production mode.

---

# 39. TESTING

Viết tests cho ít nhất:

wallet transactions

marketplace transaction

inventory transfer

business profit calculation

net worth calculation

Test đặc biệt:

2 users cùng cố mua last marketplace item.

Chỉ một transaction được thành công.

---

# 40. README

README.md phải bao gồm:

Project overview

Game concept

Screenshots nếu có

Architecture

Tech stack

Folder structure

Installation

Environment variables

How to run frontend

How to run game server

How to configure Supabase

Database migration

How to test multiplayer

How to deploy

Future roadmap

---

# 41. ENVIRONMENT

Tạo:

.env.example

Không commit:

.env

secrets

service keys

database passwords

---

# 42. DEVELOPMENT MODE WITHOUT CLOUD SERVICES

Game phải có khả năng chạy prototype local càng nhiều càng tốt.

Nếu Supabase credentials chưa được cung cấp:

không được làm toàn bộ app crash.

Có thể tạo:

mock mode

hoặc local development adapters

để ít nhất town/gameplay có thể khởi chạy.

Nhưng persistence/multiplayer thật có thể yêu cầu backend.

---

# 43. GAME DESIGN PRINCIPLE

Tránh biến game thành spreadsheet simulator.

Mặc dù game có economy phức tạp, người chơi phải nhìn thấy mọi thứ xảy ra trực quan.

Ví dụ:

Không chỉ hiển thị:

“Customer +1”

Mà NPC phải:

đi vào shop

đứng tại counter

mua coffee

exit shop

Sau đó:

+ $5

xuất hiện dưới dạng floating animation.

---

# 44. FEEDBACK

Sử dụng animation để feedback.

Ví dụ:

Earn money:

+$50

green floating text

Purchase:

-$20

red floating text

New customer:

heart / smile animation

Business level up:

celebration particles

Rain:

animated rain particles

Night:

lights turn on smoothly

---

# 45. SOUND

Architecture hỗ trợ:

background music

ambient city sound

rain sound

shop bell

coin sound

UI click

Prototype có thể dùng placeholder / royalty-free sounds.

Sound có:

mute

volume control

---

# 46. RESEARCH TRƯỚC KHI CODE

Trước khi implement, hãy kiểm tra documentation mới nhất của:

Phaser

Supabase

Supabase Realtime

Colyseus

React

Vite

Không dựa vào API cũ nếu documentation hiện tại đã thay đổi.

Nếu framework major version đã thay đổi:

ưu tiên API hiện tại stable.

---

# 47. CÁCH THỰC HIỆN

Không tạo tất cả code một lần một cách thiếu kiểm soát.

Thực hiện theo từng milestone.

## Milestone 1

Project setup.

Game canvas.

Town map.

Player movement.

Responsive desktop/mobile.

## Milestone 2

NPC simulation.

Time.

Day/night.

Weather.

## Milestone 3

Inventory.

Items.

Economy.

Shops.

## Milestone 4

Player-owned Coffee Shop.

NPC customers.

Revenue/profit.

## Milestone 5

Authentication.

Database.

Persistent save.

## Milestone 6

Marketplace.

Player-to-player trading.

## Milestone 7

Multiplayer player presence.

## Milestone 8

Polish.

Animation.

Sound.

Performance.

Tests.

---

# 48. QUY TẮC IMPLEMENTATION

Sau mỗi milestone:

1. Run project.

2. Fix compilation errors.

3. Fix console errors.

4. Run tests.

5. Verify previous functionality vẫn hoạt động.

Không để TODO placeholder cho core feature.

Không viết pseudo-code khi có thể implement thực tế.

Không fake một feature bằng button nếu gameplay interaction có thể implement được.

---

# 49. CODE QUALITY

Sử dụng:

TypeScript strict mode.

Avoid `any` nếu có thể.

Reusable components.

Clear naming.

Small focused modules.

Comments chỉ giải thích logic không hiển nhiên.

Không comment từng dòng code.

Không duplicate constants.

Dùng config files cho economy values.

Ví dụ:

STARTING_MONEY

DAY_DURATION

NPC_COUNT

BASE_ITEM_PRICES

WEATHER_PROBABILITIES

Không hardcode chúng rải rác.

---

# 50. DATABASE SECURITY

Nếu sử dụng Supabase:

Enable Row Level Security cho exposed tables.

Policies phải đảm bảo user chỉ sửa tài nguyên mà họ được phép.

Financial transactions quan trọng phải thực hiện qua server-side logic, RPC hoặc transaction-safe backend.

Service role key tuyệt đối không expose ra frontend.

Marketplace transaction phải atomic.

---

# 51. DELIVERABLE

Tôi muốn bạn trực tiếp tạo project, không chỉ giải thích cách làm.

Sau khi hoàn thành prototype, cung cấp:

1. Working source code.

2. README.

3. Architecture explanation.

4. Database schema.

5. Migration files.

6. `.env.example`.

7. Assets/license documentation.

8. Tests.

9. Instructions để chạy local.

10. Instructions test 2-player multiplayer.

11. Danh sách feature đã implement.

12. Danh sách feature chưa implement.

13. Known limitations.

14. Roadmap cho V2.

---

# 52. V2 ARCHITECTURE PREPARATION

Không implement toàn bộ, nhưng architecture nên chuẩn bị cho:

restaurants

farms

factories

warehouses

logistics

employees

salary

skills

education

stocks

crypto-like fictional assets

real estate investment

loans

credit

insurance

tax

auctions

advertising

marketing

franchises

corporations

player partnerships

business contracts

supply chain

manufacturing

imports/exports

city expansion

multiple cities

NPC employment

player employment

guild/company system

leaderboards

achievements

quests

economic recession

economic boom

seasonal events

natural events

government-like fictional policies

Không hardcode Coffee Shop theo cách khiến việc thêm business mới sau này phải rewrite hệ thống.

Business phải dựa trên reusable business definitions.

---

# 53. ĐIỀU QUAN TRỌNG NHẤT

Prototype phải tạo được cảm giác:

“I have money. What should I do with it?”

Người chơi phải liên tục đứng trước những lựa chọn:

Mua?

Bán?

Giữ tiền?

Đầu tư?

Mở shop?

Giảm giá?

Tăng giá?

Mua nhiều inventory?

Đợi thị trường?

Chấp nhận rủi ro?

Đây là bản chất gameplay quan trọng nhất.

Không biến game thành idle clicker đơn giản.

---

# 54. BẮT ĐẦU

Bây giờ hãy:

1. Inspect repository hiện tại.

2. Nếu repository trống, khởi tạo project.

3. Kiểm tra documentation hiện tại của các thư viện cần sử dụng.

4. Viết `GAME_DESIGN.md`.

5. Viết `ARCHITECTURE.md`.

6. Viết `ROADMAP.md`.

7. Thiết kế database schema.

8. Thiết kế folder structure.

9. Sau đó bắt đầu implement Milestone 1.

Không dừng lại chỉ để đưa ra kế hoạch.

Sau khi planning xong, hãy trực tiếp bắt đầu code và tạo một prototype chạy được.

Ưu tiên:

working gameplay > số lượng feature.

Ưu tiên một vertical slice hoàn chỉnh hơn 30 feature chưa hoàn thành.
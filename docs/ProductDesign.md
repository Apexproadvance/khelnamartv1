# Khelnamart — Product Design Document

## 1. Design System

### Color Palette

| Role | Color | Hex |
|---|---|---|
| Primary | Bright Blue | #2563EB |
| Secondary | Sunny Yellow | #FACC15 |
| Accent | Coral | #FB7185 |
| Background | Soft Gray | #F8FAFC |
| Success | Green | #16A34A |
| Warning | Amber | #F59E0B |
| Error | Red | #DC2626 |

Each color has a full ramp (50–900) for hierarchical application.

### Typography
- **Font:** Poppins (rounded, modern sans-serif) — headings and body.
- **Weights:** 400 (body), 600 (semibold), 700 (bold).
- **Line height:** 150% body, 120% headings.

### Spacing
8px spacing system. Consistent alignment and visual balance.

### Design Principles
- Large product imagery
- Colorful category icons
- Intuitive search prominent in header
- Minimal checkout steps
- Playful but clean interface suitable for parents
- Sufficient contrast on all backgrounds, including during transitions

## 2. Information Architecture

### Customer Site
- **Home** — hero, featured toys, categories, flash sale, trending, new arrivals
- **Browse / Search** — filters sidebar (age, price, brand, category, rating, city)
- **Category pages** — grid of products
- **Product page** — images, description, age, material, safety, brand, store, price, discount, stock, reviews, related products
- **Cart** — multi-seller items, coupon, gift wrap, delivery estimate
- **Checkout** — address, delivery method, payment (COD, mobile banking, card)
- **Order tracking** — confirmed → packed → shipped → out for delivery → delivered
- **Wishlist** — saved toys, price alerts
- **Reviews** — star ratings, images, verified purchase badge
- **Customer profile** — orders, addresses, wishlist, returns, notifications
- **Auth** — sign in / sign up

### Seller Portal
- **Dashboard** — sales, orders, revenue, visitors, best sellers
- **Products** — add, bulk upload, variants, inventory, pricing, discounts
- **Orders** — accept, reject, pack, ready, completed
- **Analytics** — revenue, top products, conversion, views
- **Marketing** — coupons, store banner, featured products
- **Payouts** — balance, settlement, invoices

## 3. Key Screens

### Home
- Sticky header with logo, search bar, category nav, cart, account
- Hero banner with playful toy imagery and value proposition
- Category circle icons row
- Flash sale countdown strip
- Featured products grid
- Trending / New arrivals sections
- Trust badges row (verified sellers, secure payment, returns)
- Footer with links, payment methods, cities served

### Product Page
- Image gallery (left)
- Title, brand, store name with rating, price + discount, stock status, age badge (right)
- Add to cart / wishlist / buy now actions
- Tabs: description, specifications (material, dimensions, safety), reviews
- Related products carousel

### Cart
- Grouped by seller
- Quantity steppers, remove, save for later
- Coupon input
- Gift wrap toggle
- Order summary with delivery estimate

### Checkout
- Address selection / entry
- Delivery method (home delivery / pickup)
- Payment method selection (bKash, Nagad, Rocket, Card, COD)
- Place order button

### Seller Dashboard
- Stat cards (revenue, orders, products, rating)
- Recent orders table
- Best-selling products list
- Quick actions (add product, view store)

## 4. Component Library
- Header (with search, nav, cart badge)
- Footer
- ProductCard (image, title, price, rating, store)
- CategoryPill
- FilterSidebar
- Button (variants: primary, secondary, accent, ghost)
- Input / Select
- Badge / Pill
- Modal / Drawer
- Toast notification
- Rating stars
- Quantity stepper
- Empty state
- Loading skeleton

## 5. Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640–1024px
- Desktop: > 1024px

Mobile-first approach. Navigation collapses to a drawer on mobile.

## 6. Micro-interactions
- Hover lift on product cards
- Add-to-cart button bounce + cart badge increment
- Smooth page transitions
- Skeleton loaders for async content
- Toast feedback for actions (added to cart, ordered, etc.)

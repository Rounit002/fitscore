# FitScan UI Layout & Design Specification

This document details the precise visual layout, component placement, and responsive behavior for every screen in the FitScan application. It serves as a reference for the exact structural differences between the Mobile and Widescreen (Desktop/Laptop) views.

---

## 🎨 Global Design System & Aesthetics

### Color Palette
- **Primary Accent**: Emerald Green (`#10b981`) and Deep Forest Green (`#4B6F44`).
- **Secondary / Warnings**: Amber/Orange (`#fd761a`, `#f59e0b`) for medium scores or streaks.
- **Danger / Harmful**: Crimson Red (`#ba1a1a`) for bad ingredients or low scores.
- **Backgrounds**:
  - **Light Mode**: Champagne Beige / Soft neutral backgrounds with clean white cards.
  - **Dark Mode**: Deep Olive / Charcoal backgrounds with elevated dark grey cards (`#1a1a1a`).
- **Gradients**: Subtle radial and linear page gradients to provide depth.

### Typography
- **Headings**: `'Sora'` (Modern, bold, geometric).
- **Body / Data**: `'DM Sans'` (Clean, highly legible for nutrition facts and lists).

### Global UI Elements
- **Cards**: All containers have heavily rounded corners (`border-radius: 24px` or `28px`), subtle borders (`1.5px solid var(--ns-border-light)`), and soft drop shadows (`var(--shadow-lg)`).
- **Buttons**: Premium hover states with micro-transformations (`translateY(-1px)`) and glowing box-shadows. Loading states feature spinning Lucide icons.

---

## 📱 Mobile vs 💻 Widescreen Desktop Layouts

### 1. Authentication (Login & Sign Up)
*   **Mobile Screen**: 
    *   **Placement**: Single column, centered.
    *   **Components**: Only the compact login/signup form card is visible, optimized for one-handed thumb reach. The form features streamlined, high-contrast inputs for credentials. The hero banner and social auth buttons are fully omitted to focus on a fast, error-free login flow.
*   **Widescreen Desktop**: 
    *   **Placement**: Side-by-side split layout.
    *   **Components**: 
        *   **Left Half**: A gorgeous gradient-shaded brand hero banner showcasing FitScan's value propositions with clean Lucide icons.
        *   **Right Half**: The premium, minimal login/signup credentials form card vertically and horizontally centered.
 
### 2. Main Dashboard (Home) & Navigation Shells
*   **Mobile Screen**: 
    *   **Placement**: Single scrollable vertical column.
    *   **Components**: 
        *   **Top Header**: User profile shortcut, theme toggle, and streak flame pill.
        *   **Scan Quota Widget**: A premium, custom-styled floating mobile scan quota card widget positioned directly under the header. It utilizes the app's exact design tokens (`var(--ns-card-bg)`, `var(--ns-border-light)`, and `rgba(16, 185, 129, 0.12)` progress bar tracks), with crisp corner roundness (`rounded-lg` / 8px) and top/bottom spacing margins (`mt-4 mb-2`) to breathe beautifully.
        *   **Center**: Circular Health Score Dial and horizontal Macro tracks (Carbs, Protein, Fat).
        *   **Bottom Stack**: Week date selector, Quick Action buttons (Scan / Database), Recent Scans list, and the BMI/Health Profile card.
        *   **Persistent Bottom Navigation**: Floating bottom navigation bar (`position: fixed`) with icons for Home, History, Scan, Compare, and Profile.
*   **Widescreen Desktop**: 
    *   **Placement**: Sticky Left Sidebar App Shell with a dual-column dashboard grid workspace.
    *   **Components**:
        *   **Left App Shell Sidebar (`DesktopAppShell`)**: A persistent sidebar containing the FitScan brand logo, high-fidelity navigation buttons (Home, History, Compare, Database, Profile), a custom-styled User Profile row, an integrated daily scan quota box with a smooth progress bar, and premium upgrade/logout actions.
        *   **Workspace - Left Column**: The Week Date Selector (flanked by left/right navigation arrows), followed by the large Daily Nutrition Score Card (dial + macros).
        *   **Workspace - Right Column**: Quick Actions (Scan/Database buttons placed side-by-side), followed by the Recent Scans list.
        *   The mobile bottom nav bar is hidden.

### 3. Compare Products Page
*   **Mobile Screen**: 
    *   **Placement**: Vertical stack.
    *   **Components**: 
        *   **Picker View**: Hero text, Search bar, and a vertical list of checkable product cards.
        *   **Comparison View**: Cards are rendered in a horizontal scrolling flex-row (`overflow-x-auto`).
*   **Widescreen Desktop**: 
    *   **Placement**: Split Workspace.
    *   **Components**:
        *   **Picker Left Column (300px)**: Hero description and Search input.
        *   **Picker Right Column**: A multi-column grid (`minmax(230px)`) of checkable product cards.
        *   **Comparison View**: Product comparison cards are displayed side-by-side in the center of the screen, limited to `320px` width each to maintain perfect proportions without stretching or horizontal scrolling.

### 4. History Page
*   **Mobile Screen**: 
    *   **Placement**: Vertical stack.
    *   **Components**: Full-width search bar at the top, followed by a vertically scrolling list of scanned history cards.
*   **Widescreen Desktop**: 
    *   **Placement**: Centered workspace grid.
    *   **Components**: 
        *   **Top**: A compact, centered Search Bar (`max-width: 480px`).
        *   **Below**: The history entries are rendered as a beautiful multi-column dashboard grid (`grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`), turning a simple list into a professional analytics deck.

### 5. Streak Leaderboard
*   **Mobile Screen**: 
    *   **Placement**: Vertical stack.
    *   **Components**: Your streak fire tile and points tile sit side-by-side at the top. The ranked leaderboard list scrolls vertically below them.
*   **Widescreen Desktop**: 
    *   **Placement**: 2-Column Gamified Dashboard.
    *   **Components**:
        *   **Left Column (320px)**: The user's statistics (Streak Fire, Points) are stacked vertically as a persistent, sticky profile widget.
        *   **Right Column**: The scrollable leaderboard ranking card, utilizing the remaining wide screen space.

### 6. Food Database Directory
*   **Mobile Screen**: 
    *   **Placement**: Vertical stack.
    *   **Components**: Hero text, full-width search input, and a vertical list of database results.
*   **Widescreen Desktop**: 
    *   **Placement**: Sidebar Search Layout.
    *   **Components**:
        *   **Left Column (320px)**: Hero description text and the Search Bar panel.
        *   **Right Column**: Search results are presented in a dynamic, multi-column grid card layout (`minmax(240px)`).

### 7. Profile & Settings
*   **Mobile Screen**: 
    *   **Placement**: Vertical stack.
    *   **Components**: Profile Avatar/Upgrade banner at the top, followed by vertical menu sections (Account, Goals, Legal, Danger Zone). Personal detail inputs and medical/goal choices are also vertically stacked lists.
*   **Widescreen Desktop**: 
    *   **Placement**: Split Dashboard Cockpit.
    *   **Components**:
        *   **Main Profile Left Column (320px)**: Profile Avatar, Name, and Premium Upgrade Widget.
        *   **Main Profile Right Column**: Menu sections stack vertically, but the action buttons *inside* those sections are placed side-by-side in a 2-column grid (`grid-template-columns: 1fr 1fr`).
        *   **Personal Details Form**: Input fields (Name, Age, Weight, etc.) are laid out in a 2-column card deck.
        *   **Medical & Goals Selection**: The search boxes are centered. The selection items (health conditions, diet goals) are rendered in a multi-column grid (`minmax(260px)`).

### 8. Scanned Results / Analysis Page
*   **Mobile Screen**: 
    *   **Placement**: Single, long vertical scroll.
    *   **Components**: Product Hero Card -> Servings Slider -> Macros -> AI Label -> Share Button -> Tabs (Truth/Effects) -> Facts List -> Healthier Alternatives -> Ingredients Audit.
*   **Widescreen Desktop**: 
    *   **Placement**: Split Dashboard Cockpit.
    *   **Components**:
        *   **Left Column (Sticky)**: Contains the Scanned Product Hero Card, Servings Controller, Share Button, and the Facts Tabs (Full Truth / Side Effects). This entire column stays anchored to the screen as you scroll.
        *   **Right Column**: Houses the deep-dive analytics—the Healthier Alternatives list and the comprehensive Beneficial/Harmful Ingredients Audit list. This eliminates endless vertical scrolling and keeps the product context visible at all times.

### 9. Trends & Progress Graph
*   **Mobile Screen**: 
    *   **Placement**: Vertical stack.
    *   **Components**: 4 stats tiles (Best day, Worst day, Trend, Streak) laid out in a 2x2 grid. Below them are the Time Range tabs, followed by the responsive `AreaChart` graph.
*   **Widescreen Desktop**: 
    *   **Placement**: Split Analytics Engine Layout.
    *   **Components**:
        *   **Left Column (320px)**: The 4 stats tiles stack vertically as a dashboard widget, immediately followed by the Time Range filter tabs and custom date inputs.
        *   **Right Column**: The interactive Widescreen Progress Graph card (`AreaChart`) spans the full height and width of this column, creating a highly professional data visualization workspace.

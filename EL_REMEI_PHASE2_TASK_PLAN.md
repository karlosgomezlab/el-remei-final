# Plan de Tareas: Fase 2 - Escandallos y Control de Stock (El Remei)

This document outlines the detailed breakdown for implementing the "Escandallos" (Recipe Costing) and Stock Control features.

## 1. Database Architect Agent (DBA)
**Goal:** Define the data structure for ingredients, recipes, and stock movements.

### Tasks:
1.  **Create `ingredients` table:**
    *   `id` (uuid, primary key)
    *   `name` (text, unique)
    *   `unit` (enum/text: 'kg', 'l', 'u', 'gr', 'ml')
    *   `cost_per_unit` (numeric, e.g., 10.50 €/kg)
    *   `stock_quantity` (numeric, current stock level)
    *   `min_stock_alert` (numeric, threshold for low stock warning)
    *   `supplier_info` (text/jsonb, optional)
    *   `created_at`, `updated_at`

2.  **Create `product_ingredients` table (Recipe Link):**
    *   `id` (uuid, primary key)
    *   `product_id` (uuid, references `products.id` on delete cascade)
    *   `ingredient_id` (uuid, references `ingredients.id` on delete restrict)
    *   `quantity_required` (numeric, amount used per dish)
    *   `waste_percentage` (numeric, optional, for more accurate costing)

3.  **Update `products` table:**
    *   Add `cost_price` (numeric, calculated total cost of ingredients) - *Can be a generated column or updated via trigger.*

4.  **Create `stock_movements` table (Audit Log):**
    *   `id` (uuid, primary key)
    *   `ingredient_id` (uuid, references `ingredients.id`)
    *   `change_amount` (numeric, positive for restock, negative for usage)
    *   `reason` (text: 'sale', 'restock', 'waste', 'correction')
    *   `reference_id` (uuid, optional, link to order_id or manual adjustment id)
    *   `created_at` (timestamp)

## 2. Backend Logic Agent (BL)
**Goal:** Implement the business logic for cost calculation and automatic stock updates.

### Tasks:
1.  **Cost Calculation Function (Trigger/RPC):**
    *   Create a Postgres function `calculate_product_cost(product_id)` that sums up `(ingredient.cost_per_unit * product_ingredient.quantity_required)`.
    *   Create a trigger that runs this function whenever `product_ingredients` changes or `ingredients.cost_per_unit` is updated to keep `products.cost_price` fresh.

2.  **Stock Deduction Logic:**
    *   Create a Postgres function `deduct_stock_from_order(order_id)` that:
        *   Iterates through items in the order.
        *   For each product, finds its ingredients.
        *   Subtracts the required quantity from `ingredients.stock_quantity`.
        *   Inserts a record into `stock_movements` with reason 'sale'.

3.  **Low Stock Alert Query:**
    *   Create a view or function `get_low_stock_ingredients()` that returns ingredients where `stock_quantity <= min_stock_alert`.

## 3. Frontend UX Agent (FE)
**Goal:** Build intuitive interfaces for chefs/managers to manage recipes and view costs.

### Tasks:
1.  **Inventory Management Page (`/admin/inventory/page.tsx`):**
    *   **CRUD for Ingredients:** Add, Edit, Delete ingredients.
    *   **Stock View:** List current stock levels with visual indicators (Red = Low, Green = OK).
    *   **Quick Adjust:** Button to quickly update stock (e.g., after shopping).

2.  **Recipe Builder (in `/admin/products/page.tsx` -> Edit Modal):**
    *   Add a new tab/section in the Product Edit Modal: "Escandallo / Receta".
    *   **Select Ingredient:** Dropdown to pick from available ingredients.
    *   **Set Quantity:** Input for amount used per dish.
    *   **Cost Preview:** Show the cost of that ingredient for this dish.
    *   **Total Cost & Margin Display:**
        *   Show `Total Cost` (Sum of ingredients).
        *   Show `Target Price` (Cost * 3 or based on desired margin %).
        *   Show `Current Profit Margin` based on selling price.

## 4. Integration Engineer Agent (IE)
**Goal:** Connect the sales flow to the inventory system seamlessly.

### Tasks:
1.  **Hook into Order Completion:**
    *   Update the `markAsServed` (or equivalent "finish order") function in `kitchen/page.tsx` or `dashboard/page.tsx`.
    *   Call the `deduct_stock_from_order` RPC function when an order is finalized.

2.  **Dashboard Notifications:**
    *   Update `dashboard/page.tsx` to subscribe to `ingredients` changes or periodically check `get_low_stock_ingredients`.
    *   Show a persistent alert or toast when key ingredients are low.

3.  **Data Consistency Checks:**
    *   Ensure that deleting a product doesn't break stock history.
    *   Ensure that selling a product without a defined recipe doesn't error out (just skips stock deduction).

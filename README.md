> note :
> menggunakan session dan cookie untuk masuk ke fungsi lain

## Admin

Base: `/api/admin`

| Method | Endpoint                            |
| ------ | ----------------------------------- |
| GET    | `/api/admin`                        |
| GET    | `/api/admin/:id`                    |
| PATCH  | `/api/admin/:id`                    |
| DELETE | `/api/admin/:id`                    |
| DELETE | `/api/admin/customer/:id`           |
| POST   | `/api/admin/login`                  |
| GET    | `/api/admin/orders`                 |
| PATCH  | `/api/admin/orders/:orderId/status` |
| GET    | `/api/admin/ping`                   |
| POST   | `/api/admin/register`               |

## Customer

Base: `/api/customer`

| Method | Endpoint                    |
| ------ | --------------------------- |
| GET    | `/api/customer`             |
| GET    | `/api/customer/:id`         |
| GET    | `/api/customer/addres/:id`  |
| POST   | `/api/customer/address`     |
| PATCH  | `/api/customer/address/:id` |
| POST   | `/api/customer/login`       |
| POST   | `/api/customer/logout`      |
| PATCH  | `/api/customer/me`          |
| POST   | `/api/customer/register`    |

## Public / Order / Payment

Base: `/api`

| Method | Endpoint                           |
| ------ | ---------------------------------- |
| POST   | `/api/:orderId/items`              |
| PATCH  | `/api/:paymentId/payment/:orderId` |
| GET    | `/api/draft`                       |
| POST   | `/api/draft`                       |
| DELETE | `/api/draft/:orderId`              |
| POST   | `/api/orders/:orderId/checkout`    |
| GET    | `/api/orders/status-history`       |
| GET    | `/api/payment/:orderId`            |
| POST   | `/api/payment/:orderId`            |
| POST   | `/api/product-create`              |
| GET    | `/api/product/:id`                 |
| DELETE | `/api/product/:id`                 |
| GET    | `/api/products`                    |

---

## Next Update

- Add Joi validation

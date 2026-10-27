# FixMate — Comprehensive Data Dictionary

A **Data Dictionary** defines the structure, data types, constraints, descriptions, and sample data for all collections used in the FixMate database.

---

## 1. `users` Collection
Stores registered accounts for all platform roles (Customers, Workers, and Administrators).

| Field Name | Data Type | Constraints / Keys | Description | Sample Data |
|---|---|---|---|---|
| `_id` | ObjectId | Primary Key | Unique identifier for the user account. | `66a1b2c3d4e5f6789012345a` |
| `name` | String | Required, Trimmed | Full name of the user / registered username. | `"Ramesh Sharma"` |
| `phone` | String | Required, Unique, 10 Digits | Primary mobile number used for login and WhatsApp coordination. | `"9820098200"` |
| `email` | String | Optional, Lowercase | Email address of the user. | `"ramesh@fixmate.in"` |
| `passwordHash` | String | Required, Hidden | Bcrypt-hashed password string (salt cost 10). | `"$2a$10$wT8Kj...e9qQ"` |
| `role` | String | Required, Enum: `['customer', 'worker', 'admin']` | Platform authorization role and permission tier. | `"worker"` |
| `avatarUrl` | String | Optional, Default: `""` | Image URL or preset identifier for user display photo. | `"https://images.unsplash.com/photo-1540569014015"` |
| `address.line` | String | Optional, Default: `""` | House number, flat, street, or building name. | `"Flat 304, Green Heights"` |
| `address.area` | String | Optional, Default: `""` | Locality, neighborhood, or sector. | `"Kothrud"` |
| `address.city` | String | Optional, Default: `""` | City name. | `"Pune"` |
| `address.pincode` | String | Optional, Default: `""` | 6-digit postal code. | `"411038"` |
| `address.location.type` | String | Enum: `['Point']`, Default: `'Point'` | GeoJSON type identifier for geospatial indexing. | `"Point"` |
| `address.location.coordinates`| Array [Number]| `[Longitude, Latitude]` | Geographic coordinates of permanent address. | `[73.8567, 18.5204]` |
| `isActive` | Boolean | Default: `true` | Account active state flag. | `true` |
| `createdAt` | Date | Auto-generated | Account registration timestamp. | `2026-08-15T09:30:00.000Z` |

---

## 2. `workerprofiles` Collection
Contains professional credentials, service offerings, workshop location, travel charges, and rating statistics for service workers.

| Field Name | Data Type | Constraints / Keys | Description | Sample Data |
|---|---|---|---|---|
| `_id` | ObjectId | Primary Key | Unique identifier for the worker profile. | `66a1b2c3d4e5f6789012345b` |
| `userId` | ObjectId | Required, Unique, Foreign Key (`users._id`) | Reference to the associated user account. | `66a1b2c3d4e5f6789012345a` |
| `bio` | String | Optional, Default: `""` | Professional summary and work description. | `"Experienced plumber with 8+ years expertise in pipe leakages."` |
| `experienceYrs` | Number | Default: `0`, Min: `0` | Years of trade experience. | `8` |
| `skills` | Array of Objects| Required, Non-empty | List of skills and associated rates offered. | `[ { categoryId: "...", baseRate: 350, rateUnit: "PER_VISIT" } ]` |
| `skills.categoryId` | ObjectId | Required, Foreign Key (`categories._id`) | Reference to service category. | `66a1b2c3d4e5f6789012345c` |
| `skills.baseRate` | Number | Required, Min: `0` | Base labor charge (in ₹) for this specific skill. | `350` |
| `skills.rateUnit` | String | Required, Enum: `['PER_VISIT', 'PER_HOUR']` | Charging model (per visit inspection vs. hourly labor). | `"PER_VISIT"` |
| `visitCharge` | Number | Default: `0`, Min: `0` | Minimum inspection / call-out fee (in ₹). | `150` |
| `perKmRate` | Number | Default: `0`, Min: `0` | Custom travel charge (in ₹) per kilometer beyond free distance. | `20` |
| `location.type` | String | Enum: `['Point']`, Default: `'Point'` | GeoJSON Point indexed with `2dsphere`. | `"Point"` |
| `location.coordinates` | Array [Number] | Required, `[Longitude, Latitude]` | Base workshop coordinates for map distance calculations. | `[73.8540, 18.5180]` |
| `address.line` | String | Optional | Base workshop street address. | `"Shop 12, Guruprasad Complex"` |
| `address.area` | String | Optional | Base workshop locality. | `"Kothrud"` |
| `address.city` | String | Optional | Base workshop city. | `"Pune"` |
| `address.pincode` | String | Optional | Base workshop postal code. | `"411038"` |
| `serviceRadiusM` | Number | Default: `5000` (5 km) | Service coverage radius in meters. | `10000` |
| `isAvailable` | Boolean | Default: `false` | Online/Offline toggle for live map visibility. | `true` |
| `isVerified` | Boolean | Default: `false` | Verification badge approval status granted by Admin. | `true` |
| `ratingAgg.sum` | Number | Default: `0` | Sum of all star ratings received. | `96` |
| `ratingAgg.count` | Number | Default: `0` | Total number of reviews received. | `20` |
| `ratingAgg.avg` | Number | Default: `0.0`, Range: `0.0 – 5.0` | Atomic average rating (`sum / count`). | `4.8` |
| `jobsCompleted` | Number | Default: `0` | Total completed bookings count. | `34` |
| `photos` | Array [String] | Default: `[]` | URLs of past work portfolio or certification photos. | `["https://fixmate.in/portfolio/w1.jpg"]` |
| `createdAt` | Date | Auto-generated | Profile creation timestamp. | `2026-08-16T11:00:00.000Z` |

---

## 3. `categories` Collection
Stores standardized service categories available on the platform.

| Field Name | Data Type | Constraints / Keys | Description | Sample Data |
|---|---|---|---|---|
| `_id` | ObjectId | Primary Key | Unique identifier for the category. | `66a1b2c3d4e5f6789012345c` |
| `slug` | String | Required, Unique, Lowercase | URL slug identifier. | `"plumber"` |
| `name` | String | Required, Trimmed | Display name of the service category. | `"Plumber"` |
| `icon` | String | Optional, Default: `""` | Lucide icon identifier or emoji for UI display. | `"Wrench"` |
| `isActive` | Boolean | Default: `true` | Active status toggle managed by admin. | `true` |

---

## 4. `bookings` Collection
Records service requests, upfront estimates, status lifecycle transitions, and final bills.

| Field Name | Data Type | Constraints / Keys | Description | Sample Data |
|---|---|---|---|---|
| `_id` | ObjectId | Primary Key | Unique identifier for the booking. | `66a1b2c3d4e5f6789012345d` |
| `code` | String | Required, Unique, Uppercase | Human-readable reference code. | `"BK-84291"` |
| `customerId` | ObjectId | Required, Foreign Key (`users._id`) | Reference to customer who booked. | `66a1b2c3d4e5f6789012345e` |
| `workerId` | ObjectId | Required, Foreign Key (`workerprofiles._id`) | Reference to selected worker profile. | `66a1b2c3d4e5f6789012345b` |
| `categoryId` | ObjectId | Required, Foreign Key (`categories._id`) | Reference to booked service category. | `66a1b2c3d4e5f6789012345c` |
| `problemText` | String | Required, Trimmed | Description of repair issue entered by customer. | `"Kitchen sink pipe leakage under counter"` |
| `photos` | Array [String] | Default: `[]` | Optional photo uploads showing damage. | `["https://fixmate.in/uploads/pipe.jpg"]` |
| `address.line` | String | Required, Min: 3 characters | Destination street address for job execution. | `"A-502, Rohan Tarang"` |
| `address.city` | String | Required, Min: 2 characters | Destination city name. | `"Pune"` |
| `address.location.type` | String | Enum: `['Point']`, Default: `'Point'` | GeoJSON Point for destination location. | `"Point"` |
| `address.location.coordinates`| Array [Number]| Required, `[Longitude, Latitude]`| Job site coordinates for map directions. | `[73.8495, 18.5132]` |
| `scheduledAt` | Date | Required | Scheduled service appointment date and time. | `2026-08-20T14:30:00.000Z` |
| `urgency` | String | Enum: `['NORMAL', 'IMMEDIATE']`, Default: `'NORMAL'`| Urgency level defining surcharge applicability. | `"NORMAL"` |
| `estimate.breakdown` | Object | Nested Document | Breakdown of visit fee, travel charge, and subtotal. | `{"visitCharge": 150, "serviceBase": 350, "travelCharge": 40}` |
| `estimate.min` | Number | Required, Min: `0` | Lower bound of upfront estimate range ($-15\%$). | `460` |
| `estimate.max` | Number | Required, Min: `0` | Upper bound of upfront estimate range ($+15\%$). | `620` |
| `final.amount` | Number | Optional | Final agreed bill submitted by worker upon completion. | `550` |
| `final.setBy` | ObjectId | Foreign Key (`users._id`) | User reference who submitted final bill. | `66a1b2c3d4e5f6789012345a` |
| `final.confirmedAt` | Date | Optional | Timestamp when customer confirmed final bill. | `2026-08-20T16:15:00.000Z` |
| `status` | String | Enum: `['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'PRICE_SET', 'COMPLETED', 'REJECTED', 'CANCELLED']` | Current lifecycle stage of the booking. | `"COMPLETED"` |
| `timeline` | Array [Object] | Audit Log | History of status transitions (`status`, `at`, `by`). | `[{"status": "PENDING", "at": "..."}, {"status": "COMPLETED", "at": "..."}]` |
| `createdAt` | Date | Auto-generated | Booking submission timestamp. | `2026-08-20T13:45:00.000Z` |
| `updatedAt` | Date | Auto-generated | Last modification timestamp. | `2026-08-20T16:15:00.000Z` |

---

## 5. `reviews` Collection
Stores customer ratings, feedback tags, and reviews after a job is completed.

| Field Name | Data Type | Constraints / Keys | Description | Sample Data |
|---|---|---|---|---|
| `_id` | ObjectId | Primary Key | Unique identifier for the review. | `66a1b2c3d4e5f6789012345f` |
| `bookingId` | ObjectId | Required, Unique, Foreign Key (`bookings._id`) | Enforces strictly one review per completed booking. | `66a1b2c3d4e5f6789012345d` |
| `workerId` | ObjectId | Required, Foreign Key (`workerprofiles._id`) | Reference to worker receiving the rating. | `66a1b2c3d4e5f6789012345b` |
| `customerId` | ObjectId | Required, Foreign Key (`users._id`) | Reference to customer writing the review. | `66a1b2c3d4e5f6789012345e` |
| `rating` | Number | Required, Integer, Min: `1`, Max: `5` | Star rating score. | `5` |
| `tags` | Array [String] | Default: `[]` | Selected feedback tags. | `["Punctual", "Clean Work", "Polite"]` |
| `text` | String | Optional, Trimmed | Written review commentary. | `"Fixed the pipe leakage quickly and professionally!"` |
| `createdAt` | Date | Auto-generated | Review submission timestamp. | `2026-08-20T16:30:00.000Z` |

---

## 6. `pricingconfigs` Collection
Global parameters controlling the server-side dynamic pricing calculation engine.

| Field Name | Data Type | Constraints / Keys | Description | Sample Data |
|---|---|---|---|---|
| `_id` | ObjectId | Primary Key | Unique identifier for configuration document. | `66a1b2c3d4e5f67890123450` |
| `perKmRate` | Number | Required, Default: `15` | Default travel rate (in ₹) per km beyond free distance. | `15` |
| `freeDistanceM` | Number | Required, Default: `1000` | Free distance threshold in meters before mileage charges apply. | `1000` |
| `urgencyFee` | Number | Required, Default: `100` | Fixed emergency surcharge (in ₹) for `IMMEDIATE` jobs. | `100` |
| `nightMultiplier` | Number | Required, Default: `1.25` | Multiplier (+25%) applied to night scheduled bookings. | `1.25` |
| `nightStartHour` | Number | Required, Default: `21` (9:00 PM) | Start hour (24h clock) when night tariff applies. | `21` |
| `nightEndHour` | Number | Required, Default: `6` (6:00 AM) | End hour (24h clock) when night tariff expires. | `6` |
| `estimateSpreadPct` | Number | Required, Default: `0.15` ($\pm 15\%$) | Percentage spread around estimate creating $[\min, \max]$ range. | `0.15` |
| `deviationThresholdPct`| Number | Required, Default: `0.20` ($20\%$) | Threshold above estimate before final bill triggers price alert. | `0.20` |
| `updatedAt` | Date | Auto-generated | Timestamp when admin last updated pricing parameters. | `2026-08-01T10:00:00.000Z` |

/**
 * @typedef {Object} Category
 * @property {number} [sortOrder] Display position, lowest first; natural Arabic name then ID breaks ties.
 * @property {string} [image] Category image URL.
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 */

/**
 * @typedef {Object} CookingOption
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {number} priceAdd
 * @property {boolean} isDefault
 */

/**
 * @typedef {Object} BilingualBullet
 * @property {string} nameEn
 * @property {string} nameAr
 */

/**
 * @typedef {Object} MenuItem
 * @property {number} [sortOrder] Position within category, independent of featured placement.
 * @property {string[]} [images] Ordered gallery; first image is also saved as image for covers/cart.
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {number} price
 * @property {string} category
 * @property {string} image
 * @property {string} descriptionEn
 * @property {string} descriptionAr
 * @property {CookingOption[]} cookingOptions
 * @property {string[]} [availableExtras]   - ids from extrasOptions
 * @property {string[]} [availableSizes]    - ids from sizeOptions
 * @property {boolean} [inStock] Missing means available; false prevents new customer orders.
 * @property {boolean} [isFeatured] Includes this product in the independent app homepage featured section.
 * @property {number} [featuredRank] App featured-section order, lowest first; independent of category position.
 * @property {Object.<string,number>} [sizeCalories] - kcal per sizeOption id
 * @property {Object.<string,number>} [sizePriceAdd] - extra SAR per size (overrides SizeOption.priceAdd)
 * @property {number} calories              - base kcal (required)
 * @property {BilingualBullet[]} [ingredients]
 * @property {string[]} [allergies]         - ids from allergiesOptions (base item)
 */

/**
 * @typedef {Object} SizeOption
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {number} priceAdd
 */

/**
 * @typedef {Object} AllergyOption
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 */

/**
 * @typedef {Object} ExtrasOption
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {number} price
 * @property {number} [calories] - kcal added when this extra is selected
 * @property {string[]} [allergyIds] - ids from allergiesOptions; shown on mobile only when this extra is selected
 */

/**
 * @typedef {Object} OfferItem
 * @property {string|null} sizeId Fixed bundle size ID; null for percentage offers (customer chooses) and unsized products.
 * @property {string} menuItemId
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {number} qty
 */

/**
 * @typedef {Object} Offer
 * @property {string[]} [images] Ordered gallery; first image is also saved as image.
 * @property {"fixed"|"percentage"} [pricingType] Defaults to fixed. Percentage applies only to the configured products/quantities.
 * @property {number|null} discountPercent Percentage rate, greater than 0 and less than 100, up to 2 decimals; null for fixed bundles.
 * @property {string} id
 * @property {string} titleEn
 * @property {string} titleAr
 * @property {string} descriptionEn
 * @property {string} descriptionAr
 * @property {string} image
 * @property {string} discount
 * @property {number} originalPrice Derived regular total; starting total for percentage offers.
 * @property {number} offerPrice Fixed bundle price, or derived starting price for percentage offers (not the pricing authority).
 * @property {OfferItem[]} items
 * @property {boolean} isActive
 */

/**
 * @typedef {'pending' | 'preparing' | 'onTheWay' | 'delivered' | 'cancelled'} OrderStatus
 */

/**
 * @typedef {'card' | 'cash'} PaymentMethod
 */

/**
 * @typedef {Object} OrderItemOption
 * @property {string} id Stable catalog/option ID used for authoritative pricing.
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {number} priceAdd
 */

/**
 * @typedef {Object} OrderItem
 * @property {string} [offerId]
 * @property {string} [offerGroupId]
 * @property {number} [offerQty]
 * @property {number} [offerLineIndex] Index of the configured offer row; rounding may split it into two unit-price lines.
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {number} price
 * @property {number} quantity
 * @property {OrderItemOption} [selectedSize]
 * @property {OrderItemOption} [selectedCookingOption]
 * @property {OrderItemOption[]} [selectedExtras]
 * @property {number} subtotal
 */

/**
 * @typedef {Object} Order
 * @property {number} [revision] Server revision for optimistic order edits and status audits.
 * @property {number} [printRevision] Content version for initial print IDs.
 * @property {boolean} [printReviewRequired] Staff must review old paper and explicitly reprint after a prepared-order edit.
 * @property {Object} [preparationStartedAt] Server preparation timestamp; closes customer/cashier editing.
 * @property {Object} [posAlertAcknowledgedAt] Shared staff alert acknowledgement.
 * @property {string} id
 * @property {string} orderNumber
 * @property {string} [orderDate] Server-assigned YYYY-MM-DD in Asia/Riyadh; orderNumber starts at 1 per branch/day.
 * @property {string} [notes] Optional trimmed customer notes, max 500 characters.
 * @property {'driveThrough' | 'pickup'} [fulfillmentType] Missing means driveThrough; pickup has empty vehicle fields. For pickup, onTheWay means ready and delivered means collected.
 * @property {string} plateNumber
 * @property {string} carModel
 * @property {string} carColor
 * @property {PaymentMethod} paymentMethod
 * @property {number} [cashAmount]
 * @property {number} [changeAmount]
 * @property {OrderItem[]} items
 * @property {number} total
 * @property {OrderStatus} status
 * @property {string} restaurantId
 * @property {string} [restaurantName]
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

/**
 * @typedef {Object} Restaurant
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {string} address
 * @property {string} phone
 * @property {string} logoImage
 * @property {boolean} isActive
 */

/**
 * @typedef {'admin' | 'cashier' | 'user'} UserRole
 */

/**
 * @typedef {Object} AppUser
 * @property {string} uid
 * @property {string} email
 * @property {string} displayName
 * @property {UserRole} role
 * @property {string} [restaurantId]
 * @property {string} [restaurantName]
 * @property {boolean} isActive
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 * @property {string} [createdBy]
 */

/**
 * @typedef {Object} Employee
 * @property {string} id
 * @property {string} displayName
 * @property {string | null} zkUserId
 * @property {string[]} [shiftIds] Zero to two attendance templates, one Fajr and one Maghrib
 * @property {string | null} [shiftId] Legacy original assignment for older records/corrections
 * @property {number} [startOffsetMinutes] Signed minutes relative to the shift start
 * @property {number} [endOffsetMinutes] Signed minutes relative to the shift end
 * @property {number[]} [weeklyOffDays] JavaScript weekday numbers, Sunday = 0
 * @property {boolean} isActive
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 * @property {string} [demoSeedId] Present only on seeded attendance employees
 */

/**
 * @typedef {Object} ShiftTemplate
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {'fixed'|'prayer'} startType
 * @property {string} startTime Manual HH:mm start in Asia/Riyadh; used for fixed starts.
 * @property {'Fajr' | 'Maghrib'} startPrayer
 * @property {number} startOffsetMinutes
 * @property {'fixed'} endType
 * @property {string} endTime HH:mm in Asia/Riyadh
 * @property {boolean} endNextDay
 * @property {number} graceMinutes
 * @property {boolean} active
 */

/**
 * @typedef {Object} AttendanceSettings
 * @property {number} monthlyLateThresholdMinutes
 * @property {'all_after_threshold'} deductionPolicy
 * @property {'Asia/Riyadh'} timezone
 * @property {{ city: string, country: string }} prayerLocation
 * @property {number} prayerCalculationMethod
 */

/**
 * @typedef {Object} PrayerTime
 * @property {string} date YYYY-MM-DD
 * @property {string} fajr HH:mm
 * @property {string} maghrib HH:mm
 * @property {'aladhan'} source
 * @property {boolean} override
 * @property {string} [overrideReason]
 * @property {string} [adjustedBy]
 */

/**
 * @typedef {Object} AttendanceOverride
 * @property {string} employeeId
 * @property {string} shiftDate YYYY-MM-DD in Asia/Riyadh
 * @property {string} [shiftId] Attendance template; absent only on legacy corrections
 * @property {'manual'} type
 * @property {string} [adjustedFirstPunch] Riyadh local timestamp
 * @property {string} [adjustedLastPunch] Riyadh local timestamp
 * @property {number} [waivedLateMinutes]
 * @property {string} reason
 * @property {string} adjustedBy
 * @property {import('firebase/firestore').Timestamp} adjustedAt
 */

/**
 * @typedef {Object} AttendanceEvent
 * @property {string} id
 * @property {string} deviceSerial
 * @property {string} zkUserId
 * @property {string} eventTimeRaw
 * @property {import('firebase/firestore').Timestamp | null} eventTime
 * @property {number | null} status
 * @property {number | null} verifyType
 * @property {string | null} workCode
 * @property {'zkteco' | 'demo'} source
 * @property {'SenseFace 2A' | 'Synthetic Demo'} deviceModel
 * @property {string} raw
 * @property {import('firebase/firestore').Timestamp} receivedAt
 * @property {string} [demoSeedId] Present only on synthetic attendance events
 */

/**
 * @typedef {Object} AttendanceDevice
 * @property {string} serialNumber
 * @property {'zkteco'} provider
 * @property {'SenseFace 2A'} model
 * @property {import('firebase/firestore').Timestamp} lastSeenAt
 */

/**
 * @typedef {Object} AuditEntry
 * @property {string} status
 * @property {import('firebase/firestore').Timestamp} changedAt
 * @property {string} changedBy
 * @property {string} changedByName
 */

/**
 * @typedef {'en' | 'ar'} Locale
 */

/**
 * @typedef {'ltr' | 'rtl'} Direction
 */

// This file only contains JSDoc type definitions.
// Import types in other files using JSDoc @type comments.
export {};

/**
 * @typedef {Object} AppUpdatePolicy
 * @property {"off"|"optional"|"forced"} mode
 * @property {string} version Target major.minor.patch version; only older clients are prompted.
 * @property {string} url HTTPS platform store app URL; required unless disabled.
 */

/**
 * @typedef {Object} MobileAppSettings
 * @property {{titleEn: string, titleAr: string, descriptionEn: string, descriptionAr: string, image: string}} hero
 * @property {{ios: AppUpdatePolicy, android: AppUpdatePolicy}} updates
 */

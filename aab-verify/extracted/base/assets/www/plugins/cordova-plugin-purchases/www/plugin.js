cordova.define("cordova-plugin-purchases.plugin", function(require, exports, module) {
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERIOD_UNIT = exports.OFFER_PAYMENT_MODE = exports.RECURRENCE_MODE = exports.PURCHASES_ARE_COMPLETED_BY_TYPE = exports.STOREKIT_VERSION = exports.PRODUCT_CATEGORY = exports.IN_APP_MESSAGE_TYPE = exports.LOG_LEVEL = exports.INTRO_ELIGIBILITY_STATUS = exports.PACKAGE_TYPE = exports.PRORATION_MODE = exports.REFUND_REQUEST_STATUS = exports.BILLING_FEATURE = exports.PURCHASE_TYPE = exports.ATTRIBUTION_NETWORK = void 0;
var PLUGIN_NAME = "PurchasesPlugin";
var ATTRIBUTION_NETWORK;
(function (ATTRIBUTION_NETWORK) {
    ATTRIBUTION_NETWORK[ATTRIBUTION_NETWORK["APPLE_SEARCH_ADS"] = 0] = "APPLE_SEARCH_ADS";
    ATTRIBUTION_NETWORK[ATTRIBUTION_NETWORK["ADJUST"] = 1] = "ADJUST";
    ATTRIBUTION_NETWORK[ATTRIBUTION_NETWORK["APPSFLYER"] = 2] = "APPSFLYER";
    ATTRIBUTION_NETWORK[ATTRIBUTION_NETWORK["BRANCH"] = 3] = "BRANCH";
    ATTRIBUTION_NETWORK[ATTRIBUTION_NETWORK["TENJIN"] = 4] = "TENJIN";
    ATTRIBUTION_NETWORK[ATTRIBUTION_NETWORK["FACEBOOK"] = 5] = "FACEBOOK";
})(ATTRIBUTION_NETWORK = exports.ATTRIBUTION_NETWORK || (exports.ATTRIBUTION_NETWORK = {}));
var PURCHASE_TYPE;
(function (PURCHASE_TYPE) {
    /**
     * A type of SKU for in-app products.
     */
    PURCHASE_TYPE["INAPP"] = "inapp";
    /**
     * A type of SKU for subscriptions.
     */
    PURCHASE_TYPE["SUBS"] = "subs";
})(PURCHASE_TYPE = exports.PURCHASE_TYPE || (exports.PURCHASE_TYPE = {}));
/**
 * Enum for billing features.
 * Currently, these are only relevant for Google Play Android users:
 * https://developer.android.com/reference/com/android/billingclient/api/BillingClient.FeatureType
 */
var BILLING_FEATURE;
(function (BILLING_FEATURE) {
    /**
     * Purchase/query for subscriptions.
     */
    BILLING_FEATURE[BILLING_FEATURE["SUBSCRIPTIONS"] = 0] = "SUBSCRIPTIONS";
    /**
     * Subscriptions update/replace.
     */
    BILLING_FEATURE[BILLING_FEATURE["SUBSCRIPTIONS_UPDATE"] = 1] = "SUBSCRIPTIONS_UPDATE";
    /**
     * Purchase/query for in-app items on VR.
     */
    BILLING_FEATURE[BILLING_FEATURE["IN_APP_ITEMS_ON_VR"] = 2] = "IN_APP_ITEMS_ON_VR";
    /**
     * Purchase/query for subscriptions on VR.
     */
    BILLING_FEATURE[BILLING_FEATURE["SUBSCRIPTIONS_ON_VR"] = 3] = "SUBSCRIPTIONS_ON_VR";
    /**
     * Launch a price change confirmation flow.
     */
    BILLING_FEATURE[BILLING_FEATURE["PRICE_CHANGE_CONFIRMATION"] = 4] = "PRICE_CHANGE_CONFIRMATION";
})(BILLING_FEATURE = exports.BILLING_FEATURE || (exports.BILLING_FEATURE = {}));
var REFUND_REQUEST_STATUS;
(function (REFUND_REQUEST_STATUS) {
    /**
     * Apple has received the refund request.
     */
    REFUND_REQUEST_STATUS[REFUND_REQUEST_STATUS["SUCCESS"] = 0] = "SUCCESS";
    /**
     * User canceled submission of the refund request.
     */
    REFUND_REQUEST_STATUS[REFUND_REQUEST_STATUS["USER_CANCELLED"] = 1] = "USER_CANCELLED";
    /**
     * There was an error with the request. See message for more details.
     */
    REFUND_REQUEST_STATUS[REFUND_REQUEST_STATUS["ERROR"] = 2] = "ERROR";
})(REFUND_REQUEST_STATUS = exports.REFUND_REQUEST_STATUS || (exports.REFUND_REQUEST_STATUS = {}));
var PRORATION_MODE;
(function (PRORATION_MODE) {
    PRORATION_MODE[PRORATION_MODE["UNKNOWN_SUBSCRIPTION_UPGRADE_DOWNGRADE_POLICY"] = 0] = "UNKNOWN_SUBSCRIPTION_UPGRADE_DOWNGRADE_POLICY";
    /**
     * Replacement takes effect immediately, and the remaining time will be
     * prorated and credited to the user. This is the current default behavior.
     */
    PRORATION_MODE[PRORATION_MODE["IMMEDIATE_WITH_TIME_PRORATION"] = 1] = "IMMEDIATE_WITH_TIME_PRORATION";
    /**
     * Replacement takes effect immediately, and the billing cycle remains the
     * same. The price for the remaining period will be charged. This option is
     * only available for subscription upgrade.
     */
    PRORATION_MODE[PRORATION_MODE["IMMEDIATE_AND_CHARGE_PRORATED_PRICE"] = 2] = "IMMEDIATE_AND_CHARGE_PRORATED_PRICE";
    /**
     * Replacement takes effect immediately, and the new price will be charged on
     * next recurrence time. The billing cycle stays the same.
     */
    PRORATION_MODE[PRORATION_MODE["IMMEDIATE_WITHOUT_PRORATION"] = 3] = "IMMEDIATE_WITHOUT_PRORATION";
    /**
     * Replacement takes effect immediately, and the user is charged full price
     * of new plan and is given a full billing cycle of subscription,
     * plus remaining prorated time from the old plan.
     */
    PRORATION_MODE[PRORATION_MODE["IMMEDIATE_AND_CHARGE_FULL_PRICE"] = 5] = "IMMEDIATE_AND_CHARGE_FULL_PRICE";
    /**
     * Replacement takes effect when the old plan expires, and the new price will be charged at the same time.
     *
     * Example: Samwise's Tier 1 subscription continues until it expires on April 30. On May 1st, the
     * Tier 2 subscription takes effect, and Samwise is charged $36 for his new subscription tier.
     */
    PRORATION_MODE[PRORATION_MODE["DEFERRED"] = 6] = "DEFERRED";
})(PRORATION_MODE = exports.PRORATION_MODE || (exports.PRORATION_MODE = {}));
var PACKAGE_TYPE;
(function (PACKAGE_TYPE) {
    /**
     * A package that was defined with a custom identifier.
     */
    PACKAGE_TYPE["UNKNOWN"] = "UNKNOWN";
    /**
     * A package that was defined with a custom identifier.
     */
    PACKAGE_TYPE["CUSTOM"] = "CUSTOM";
    /**
     * A package configured with the predefined lifetime identifier.
     */
    PACKAGE_TYPE["LIFETIME"] = "LIFETIME";
    /**
     * A package configured with the predefined annual identifier.
     */
    PACKAGE_TYPE["ANNUAL"] = "ANNUAL";
    /**
     * A package configured with the predefined six month identifier.
     */
    PACKAGE_TYPE["SIX_MONTH"] = "SIX_MONTH";
    /**
     * A package configured with the predefined three month identifier.
     */
    PACKAGE_TYPE["THREE_MONTH"] = "THREE_MONTH";
    /**
     * A package configured with the predefined two month identifier.
     */
    PACKAGE_TYPE["TWO_MONTH"] = "TWO_MONTH";
    /**
     * A package configured with the predefined monthly identifier.
     */
    PACKAGE_TYPE["MONTHLY"] = "MONTHLY";
    /**
     * A package configured with the predefined weekly identifier.
     */
    PACKAGE_TYPE["WEEKLY"] = "WEEKLY";
})(PACKAGE_TYPE = exports.PACKAGE_TYPE || (exports.PACKAGE_TYPE = {}));
var INTRO_ELIGIBILITY_STATUS;
(function (INTRO_ELIGIBILITY_STATUS) {
    /**
     * RevenueCat doesn't have enough information to determine eligibility.
     */
    INTRO_ELIGIBILITY_STATUS[INTRO_ELIGIBILITY_STATUS["INTRO_ELIGIBILITY_STATUS_UNKNOWN"] = 0] = "INTRO_ELIGIBILITY_STATUS_UNKNOWN";
    /**
     * The user is not eligible for a free trial or intro pricing for this product.
     */
    INTRO_ELIGIBILITY_STATUS[INTRO_ELIGIBILITY_STATUS["INTRO_ELIGIBILITY_STATUS_INELIGIBLE"] = 1] = "INTRO_ELIGIBILITY_STATUS_INELIGIBLE";
    /**
     * The user is eligible for a free trial or intro pricing for this product.
     */
    INTRO_ELIGIBILITY_STATUS[INTRO_ELIGIBILITY_STATUS["INTRO_ELIGIBILITY_STATUS_ELIGIBLE"] = 2] = "INTRO_ELIGIBILITY_STATUS_ELIGIBLE";
    /**
     * There is no free trial or intro pricing for this product.
     */
    INTRO_ELIGIBILITY_STATUS[INTRO_ELIGIBILITY_STATUS["INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS"] = 3] = "INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS";
})(INTRO_ELIGIBILITY_STATUS = exports.INTRO_ELIGIBILITY_STATUS || (exports.INTRO_ELIGIBILITY_STATUS = {}));
var LOG_LEVEL;
(function (LOG_LEVEL) {
    LOG_LEVEL["VERBOSE"] = "VERBOSE";
    LOG_LEVEL["DEBUG"] = "DEBUG";
    LOG_LEVEL["INFO"] = "INFO";
    LOG_LEVEL["WARN"] = "WARN";
    LOG_LEVEL["ERROR"] = "ERROR";
})(LOG_LEVEL = exports.LOG_LEVEL || (exports.LOG_LEVEL = {}));
/**
 * Enum for in-app message types.
 * This can be used if you disable automatic in-app message from showing automatically.
 * Then, you can pass what type of messages you want to show in the `showInAppMessages`
 * method in Purchases.
 */
var IN_APP_MESSAGE_TYPE;
(function (IN_APP_MESSAGE_TYPE) {
    // Make sure the enum values are in sync with those defined in iOS/Android
    /**
     * In-app messages to indicate there has been a billing issue charging the user.
     */
    IN_APP_MESSAGE_TYPE[IN_APP_MESSAGE_TYPE["BILLING_ISSUE"] = 0] = "BILLING_ISSUE";
    /**
     * iOS-only. This message will show if you increase the price of a subscription and
     * the user needs to opt-in to the increase.
     */
    IN_APP_MESSAGE_TYPE[IN_APP_MESSAGE_TYPE["PRICE_INCREASE_CONSENT"] = 1] = "PRICE_INCREASE_CONSENT";
    /**
     * iOS-only. StoreKit generic messages.
     */
    IN_APP_MESSAGE_TYPE[IN_APP_MESSAGE_TYPE["GENERIC"] = 2] = "GENERIC";
    /**
     * iOS-only. This message will show if the subscriber is eligible for an iOS win-back
     * offer and will allow the subscriber to redeem the offer.
     */
    IN_APP_MESSAGE_TYPE[IN_APP_MESSAGE_TYPE["WIN_BACK_OFFER"] = 3] = "WIN_BACK_OFFER";
})(IN_APP_MESSAGE_TYPE = exports.IN_APP_MESSAGE_TYPE || (exports.IN_APP_MESSAGE_TYPE = {}));
var PRODUCT_CATEGORY;
(function (PRODUCT_CATEGORY) {
    /**
     * A type of product for non-subscription.
     */
    PRODUCT_CATEGORY["NON_SUBSCRIPTION"] = "NON_SUBSCRIPTION";
    /**
     * A type of product for subscriptions.
     */
    PRODUCT_CATEGORY["SUBSCRIPTION"] = "SUBSCRIPTION";
    /**
     * A type of product for unknowns.
     */
    PRODUCT_CATEGORY["UNKNOWN"] = "UNKNOWN";
})(PRODUCT_CATEGORY = exports.PRODUCT_CATEGORY || (exports.PRODUCT_CATEGORY = {}));
/**
 * Defines which version of StoreKit may be used
 */
var STOREKIT_VERSION;
(function (STOREKIT_VERSION) {
    /**
     * Always use StoreKit 1.
     */
    STOREKIT_VERSION["STOREKIT_1"] = "STOREKIT_1";
    /**
     * Always use StoreKit 2 (StoreKit 1 will be used if StoreKit 2 is not available in the current device.)
     * - Warning: Make sure you have an In-App Purchase Key configured in your app.
     * Please see https://rev.cat/in-app-purchase-key-configuration for more info.
     */
    STOREKIT_VERSION["STOREKIT_2"] = "STOREKIT_2";
    /**
     * Let RevenueCat use the most appropiate version of StoreKit
     */
    STOREKIT_VERSION["DEFAULT"] = "DEFAULT";
})(STOREKIT_VERSION = exports.STOREKIT_VERSION || (exports.STOREKIT_VERSION = {}));
/**
 * Modes for completing the purchase process.
 */
var PURCHASES_ARE_COMPLETED_BY_TYPE;
(function (PURCHASES_ARE_COMPLETED_BY_TYPE) {
    /**
     * RevenueCat will **not** automatically acknowledge any purchases. You will have to do so manually.
     *
     * **Note:** failing to acknowledge a purchase within 3 days will lead to Google Play automatically issuing a
     * refund to the user.
     *
     * For more info, see [revenuecat.com](https://docs.revenuecat.com/docs/observer-mode#option-2-client-side).
     */
    PURCHASES_ARE_COMPLETED_BY_TYPE["MY_APP"] = "MY_APP";
    /**
     * RevenueCat will automatically acknowledge verified purchases. No action is required by you.
     */
    PURCHASES_ARE_COMPLETED_BY_TYPE["REVENUECAT"] = "REVENUECAT";
})(PURCHASES_ARE_COMPLETED_BY_TYPE = exports.PURCHASES_ARE_COMPLETED_BY_TYPE || (exports.PURCHASES_ARE_COMPLETED_BY_TYPE = {}));
/**
 * Recurrence mode for a pricing phase
 */
var RECURRENCE_MODE;
(function (RECURRENCE_MODE) {
    /**
     * Pricing phase repeats infinitely until cancellation
     */
    RECURRENCE_MODE[RECURRENCE_MODE["INFINITE_RECURRING"] = 1] = "INFINITE_RECURRING";
    /**
     * Pricing phase repeats for a fixed number of billing periods
     */
    RECURRENCE_MODE[RECURRENCE_MODE["FINITE_RECURRING"] = 2] = "FINITE_RECURRING";
    /**
     * Pricing phase does not repeat
     */
    RECURRENCE_MODE[RECURRENCE_MODE["NON_RECURRING"] = 3] = "NON_RECURRING";
})(RECURRENCE_MODE = exports.RECURRENCE_MODE || (exports.RECURRENCE_MODE = {}));
/**
 * Payment mode for offer pricing phases. Google Play only.
 */
var OFFER_PAYMENT_MODE;
(function (OFFER_PAYMENT_MODE) {
    /**
     * Subscribers don't pay until the specified period ends
     */
    OFFER_PAYMENT_MODE["FREE_TRIAL"] = "FREE_TRIAL";
    /**
     * Subscribers pay up front for a specified period
     */
    OFFER_PAYMENT_MODE["SINGLE_PAYMENT"] = "SINGLE_PAYMENT";
    /**
     * Subscribers pay a discounted amount for a specified number of periods
     */
    OFFER_PAYMENT_MODE["DISCOUNTED_RECURRING_PAYMENT"] = "DISCOUNTED_RECURRING_PAYMENT";
})(OFFER_PAYMENT_MODE = exports.OFFER_PAYMENT_MODE || (exports.OFFER_PAYMENT_MODE = {}));
/**
 * Time duration unit for Period.
 */
var PERIOD_UNIT;
(function (PERIOD_UNIT) {
    PERIOD_UNIT["DAY"] = "DAY";
    PERIOD_UNIT["WEEK"] = "WEEK";
    PERIOD_UNIT["MONTH"] = "MONTH";
    PERIOD_UNIT["YEAR"] = "YEAR";
    PERIOD_UNIT["UNKNOWN"] = "UNKNOWN";
})(PERIOD_UNIT = exports.PERIOD_UNIT || (exports.PERIOD_UNIT = {}));
var shouldPurchasePromoProductListeners = [];
var Purchases = /** @class */ (function () {
    function Purchases() {
    }
    /**
     * @deprecated Use {@link configureWith} instead. It accepts a {@link PurchasesConfiguration} object which offers more flexibility.
     *
     * Sets up Purchases with your API key and an app user id.
     * @param {string} apiKey RevenueCat API Key. Needs to be a string
     * @param {string?} appUserID A unique id for identifying the user
     * @param {string?} userDefaultsSuiteName An optional string. iOS-only, will be ignored for Android.
     * Set this if you would like the RevenueCat SDK to store its preferences in a different NSUserDefaults
     * suite, otherwise it will use standardUserDefaults. Default is null, which will make the SDK use standardUserDefaults.
     */
    Purchases.configure = function (apiKey, appUserID, userDefaultsSuiteName) {
        this.configureWith({
            apiKey: apiKey,
            appUserID: appUserID,
            userDefaultsSuiteName: userDefaultsSuiteName,
            useAmazon: false
        });
    };
    /**
     * Sets up Purchases with your API key and an app user id.
     * @param {PurchasesConfiguration} Object containing configuration parameters
     */
    Purchases.configureWith = function (_a) {
        var apiKey = _a.apiKey, _b = _a.appUserID, appUserID = _b === void 0 ? null : _b, purchasesAreCompletedBy = _a.purchasesAreCompletedBy, userDefaultsSuiteName = _a.userDefaultsSuiteName, storeKitVersion = _a.storeKitVersion, _c = _a.useAmazon, useAmazon = _c === void 0 ? false : _c, _d = _a.shouldShowInAppMessagesAutomatically, shouldShowInAppMessagesAutomatically = _d === void 0 ? true : _d;
        var purchasesCompletedByToUse = purchasesAreCompletedBy === PURCHASES_ARE_COMPLETED_BY_TYPE.REVENUECAT ? PURCHASES_ARE_COMPLETED_BY_TYPE.REVENUECAT : undefined;
        var storeKitVersionToUse = storeKitVersion;
        if (purchasesAreCompletedBy && Purchases.isPurchasesAreCompletedByMyApp(purchasesAreCompletedBy)) {
            purchasesCompletedByToUse = PURCHASES_ARE_COMPLETED_BY_TYPE.MY_APP;
            storeKitVersionToUse = purchasesAreCompletedBy.storeKitVersion;
            if (storeKitVersionToUse === STOREKIT_VERSION.DEFAULT) {
                // tslint:disable-next-line:no-console
                console.warn("Warning: You should provide the specific StoreKit version you're using in your implementation, and not rely on the DEFAULT.");
            }
            if (storeKitVersion && storeKitVersionToUse !== storeKitVersion) {
                // Typically, console messages aren't used in TS libraries, but in this case it's worth calling out the difference in
                // StoreKit versions, and since the difference isn't possible farther down the call chain, we should go ahead
                // and log it here.
                // tslint:disable-next-line:no-console
                console.warn("Warning: The storeKitVersion in purchasesAreCompletedBy does not match the function's storeKitVersion parameter. We will use the value found in purchasesAreCompletedBy.");
            }
        }
        window.cordova.exec(null, null, PLUGIN_NAME, "configure", [apiKey, appUserID, purchasesCompletedByToUse, userDefaultsSuiteName, storeKitVersionToUse,
            useAmazon, shouldShowInAppMessagesAutomatically]);
        window.cordova.exec(function (customerInfo) {
            window.cordova.fireWindowEvent("onCustomerInfoUpdated", customerInfo);
        }, null, PLUGIN_NAME, "setupDelegateCallback", []);
        this.setupShouldPurchasePromoProductCallback();
    };
    /**
     * Gets the Offerings configured in the RevenueCat dashboard
     * @param {function(PurchasesOfferings):void} callback Callback triggered after a successful getOfferings call.
     * @param {function(PurchasesError):void} errorCallback Callback triggered after an error or when retrieving offerings.
     */
    Purchases.getOfferings = function (callback, errorCallback) {
        window.cordova.exec(callback, errorCallback, PLUGIN_NAME, "getOfferings", []);
    };
    /**
     * Fetch the product info
     * @param {[string]} productIdentifiers Array of product identifiers
     * @param {function(PurchasesStoreProduct[]):void} callback Callback triggered after a successful getProducts call. It will receive an array of product objects.
     * @param {function(PurchasesError):void} errorCallback Callback triggered after an error or when retrieving products
     * @param {PURCHASE_TYPE} type Optional type of products to fetch, can be inapp or subs. Subs by default
     */
    Purchases.getProducts = function (productIdentifiers, callback, errorCallback, type) {
        if (type === void 0) { type = PURCHASE_TYPE.SUBS; }
        window.cordova.exec(callback, errorCallback, PLUGIN_NAME, "getProducts", [productIdentifiers, type]);
    };
    /**
     * iOS 18.0+ only. Use this function to retrieve the eligible win-back offers that a subscriber
     * is eligible for for a given product.
     *
     * @param {PurchasesStoreProduct} product The product the user intends to purchase.
     * @param {function(PurchasesWinBackOffer[]):void} callback Callback triggered after a successful getEligibleWinBackOffersForProduct call.
     * It will receive an array of eligible win-back objects for the provided product.
     * @param {function(PurchasesError):void} errorCallback Callback triggered after an error when retrieving eligible win-back offers.
     */
    Purchases.getEligibleWinBackOffersForProduct = function (product, callback, errorCallback) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                window.cordova.exec(callback, errorCallback, PLUGIN_NAME, "getEligibleWinBackOffersForProduct", [product.identifier]);
                return [2 /*return*/];
            });
        });
    };
    /**
     * iOS 18.0+ only. Use this function to purchase a product with a win-back offer.
     * Fetch eligible win-back offers with getEligibleWinBackOffersForProduct.
     *
     * @param {PurchasesStoreProduct} product The product the user intends to purchase.
     * @param {PurchasesWinBackOffer} winBackOffer The win-back offer the user intends to purchase.
     * @param {function(string, CustomerInfo):void} callback Callback triggered after a successful purchaseProductWithWinBackOffer call.
     * @param {function(PurchasesError, boolean):void} errorCallback Callback triggered after an error.
     */
    Purchases.purchaseProductWithWinBackOffer = function (product, winBackOffer, callback, errorCallback) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                window.cordova.exec(callback, function (response) {
                    var userCancelled = response.userCancelled, error = __rest(response, ["userCancelled"]);
                    errorCallback({
                        error: error,
                        userCancelled: userCancelled,
                    });
                }, PLUGIN_NAME, "purchaseProductWithWinBackOffer", [product.identifier, winBackOffer.identifier]);
                return [2 /*return*/];
            });
        });
    };
    /**
     * iOS 18.0+ only. Use this function to retrieve the eligible win-back offers that a subscriber
     * is eligible for for a given package.
     *
     * @param {PurchasesPackage} package The package the user intends to purchase.
     * @param {function(PurchasesWinBackOffer[]):void} callback Callback triggered after a successful getEligibleWinBackOffersForPackage call.
     * It will receive an array of eligible win-back objects for the provided package.
     * @param {function(PurchasesError):void} errorCallback Callback triggered after an error when retrieving eligible win-back offers.
     */
    Purchases.getEligibleWinBackOffersForPackage = function (aPackage, callback, errorCallback) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                window.cordova.exec(callback, errorCallback, PLUGIN_NAME, "getEligibleWinBackOffersForProduct", [aPackage.product.identifier]);
                return [2 /*return*/];
            });
        });
    };
    /**
     * iOS 18.0+ only. Use this function to purchase a product with a win-back offer.
     * Fetch eligible win-back offers with getEligibleWinBackOffersForProduct.
     *
     * @param {PurchasesPackage} aPackage The package the user intends to purchase.
     * @param {PurchasesWinBackOffer} winBackOffer The win-back offer the user intends to purchase.
     * @param {function(string, CustomerInfo):void} callback Callback triggered after a successful purchasePackageWithWinBackOffer call.
     * @param {function(PurchasesError, boolean):void} errorCallback Callback triggered after an error.
     */
    Purchases.purchasePackageWithWinBackOffer = function (aPackage, winBackOffer, callback, errorCallback) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                window.cordova.exec(callback, function (response) {
                    var userCancelled = response.userCancelled, error = __rest(response, ["userCancelled"]);
                    errorCallback({
                        error: error,
                        userCancelled: userCancelled,
                    });
                }, PLUGIN_NAME, "purchasePackageWithWinBackOffer", [aPackage.identifier, aPackage.offeringIdentifier, winBackOffer.identifier]);
                return [2 /*return*/];
            });
        });
    };
    /**
     * Make a purchase
     *
     * @param {string} productIdentifier The product identifier of the product you want to purchase.
     * @param {function(string, CustomerInfo):void} callback Callback triggered after a successful purchase.
     * @param {function(PurchasesError, boolean):void} errorCallback Callback triggered after an error or when the user cancels the purchase.
     * If user cancelled, userCancelled will be true
     * @param {UpgradeInfo} upgradeInfo Android only. Optional UpgradeInfo you wish to upgrade from containing the oldSKU
     * and the optional prorationMode.
     * @param {PURCHASE_TYPE} type Optional type of product, can be inapp or subs. Subs by default
     */
    Purchases.purchaseProduct = function (productIdentifier, callback, errorCallback, upgradeInfo, type) {
        if (type === void 0) { type = PURCHASE_TYPE.SUBS; }
        window.cordova.exec(callback, function (response) {
            var userCancelled = response.userCancelled, error = __rest(response, ["userCancelled"]);
            errorCallback({
                error: error,
                userCancelled: userCancelled,
            });
        }, PLUGIN_NAME, "purchaseProduct", [
            productIdentifier,
            upgradeInfo !== undefined && upgradeInfo !== null ? upgradeInfo.oldSKU : null,
            upgradeInfo !== undefined && upgradeInfo !== null
                ? upgradeInfo.prorationMode
                : null,
            type,
            false,
            null,
        ]);
    };
    /**
     * Make a purchase
     *
     * @param {PurchasesStoreProduct} product The product you want to purchase
     * @param {function(string, CustomerInfo):void} callback Callback triggered after a successful purchase.
     * @param {function(PurchasesError, boolean):void} errorCallback Callback triggered after an error or when the user cancels the purchase
     * If user cancelled, userCancelled will be true
     * @param {GoogleProductChangeInfo} googleProductChangeInfo Android only. Optional GoogleProductChangeInfo you
     * wish to upgrade from containing the oldProductIdentifier and the optional prorationMode.
     * @param {boolean} googleIsPersonalizedPrice Android and Google only. Optional boolean indicates personalized pricing on products available for purchase in the EU.
     * For compliance with EU regulations. User will see "This price has been customized for you" in the purchase dialog when true.
     * See https://developer.android.com/google/play/billing/integrate#personalized-price for more info.
     */
    Purchases.purchaseStoreProduct = function (product, callback, errorCallback, googleProductChangeInfo, googleIsPersonalizedPrice) {
        if (googleIsPersonalizedPrice === void 0) { googleIsPersonalizedPrice = false; }
        window.cordova.exec(callback, function (response) {
            var userCancelled = response.userCancelled, error = __rest(response, ["userCancelled"]);
            errorCallback({
                error: error,
                userCancelled: userCancelled,
            });
        }, PLUGIN_NAME, "purchaseProduct", [
            product.identifier,
            googleProductChangeInfo !== undefined && googleProductChangeInfo !== null ? googleProductChangeInfo.oldProductIdentifier : null,
            googleProductChangeInfo !== undefined && googleProductChangeInfo !== null
                ? googleProductChangeInfo.prorationMode
                : null,
            product.productCategory,
            googleIsPersonalizedPrice,
            product.presentedOfferingIdentifier,
        ]);
    };
    /**
     * Make a purchase
     *
     * @param {PurchasesPackage} aPackage The Package you wish to purchase. You can get the Packages by calling getOfferings
     * @param {function(string, CustomerInfo):void} callback Callback triggered after a successful purchase.
     * @param {function(PurchasesError, boolean):void} errorCallback Callback triggered after an error or when the user cancels the purchase.
     * If user cancelled, userCancelled will be true
     * @param {UpgradeInfo} upgradeInfo Android only. Optional UpgradeInfo you wish to upgrade from containing the oldSKU
     * and the optional prorationMode.
     * @param {GoogleProductChangeInfo} googleProductChangeInfo Android only. Optional GoogleProductChangeInfo you
     * @param {boolean} googleIsPersonalizedPrice Android and Google only. Optional boolean indicates personalized pricing on products available for purchase in the EU.
     * For compliance with EU regulations. User will see "This price has been customized for you" in the purchase dialog when true.
     * See https://developer.android.com/google/play/billing/integrate#personalized-price for more info.
     */
    Purchases.purchasePackage = function (aPackage, callback, errorCallback, upgradeInfo, googleProductChangeInfo, googleIsPersonalizedPrice) {
        if (googleIsPersonalizedPrice === void 0) { googleIsPersonalizedPrice = false; }
        var oldProductIdentifier = null;
        var prorationMode = null;
        if (googleProductChangeInfo !== undefined && googleProductChangeInfo !== null) {
            oldProductIdentifier = googleProductChangeInfo.oldProductIdentifier;
            prorationMode = googleProductChangeInfo.prorationMode;
        }
        else if (upgradeInfo !== undefined && upgradeInfo !== null) {
            oldProductIdentifier = upgradeInfo.oldSKU;
            prorationMode = upgradeInfo.prorationMode;
        }
        window.cordova.exec(callback, function (response) {
            var userCancelled = response.userCancelled, error = __rest(response, ["userCancelled"]);
            errorCallback({
                error: error,
                userCancelled: userCancelled,
            });
        }, PLUGIN_NAME, "purchasePackage", [
            aPackage.identifier,
            aPackage.offeringIdentifier,
            oldProductIdentifier,
            prorationMode,
            googleIsPersonalizedPrice,
        ]);
    };
    /**
     * Google only. Make a purchase of a subscriptionOption
     *
     * @param {SubscriptionOption} subscriptionOption The SubscriptionOption you wish to purchase. You can get the SubscriptionOption from StoreProducts by calling getOfferings
     * @param {function(string, CustomerInfo):void} callback Callback triggered after a successful purchase.
     * @param {function(PurchasesError, boolean):void} errorCallback Callback triggered after an error or when the user cancels the purchase.
     * If user cancelled, userCancelled will be true
     * @param {GoogleProductChangeInfo} googleProductChangeInfo Android only. Optional GoogleProductChangeInfo you
     * wish to upgrade from containing the oldProductIdentifier and the optional prorationMode.
     * @param {boolean} googleIsPersonalizedPrice Android and Google only. Optional boolean indicates personalized pricing on products available for purchase in the EU.
     * For compliance with EU regulations. User will see "This price has been customized for you" in the purchase dialog when true.
     * See https://developer.android.com/google/play/billing/integrate#personalized-price for more info.
     */
    Purchases.purchaseSubscriptionOption = function (subscriptionOption, callback, errorCallback, googleProductChangeInfo, googleIsPersonalizedPrice) {
        if (googleIsPersonalizedPrice === void 0) { googleIsPersonalizedPrice = false; }
        window.cordova.exec(callback, function (response) {
            var userCancelled = response.userCancelled, error = __rest(response, ["userCancelled"]);
            errorCallback({
                error: error,
                userCancelled: userCancelled,
            });
        }, PLUGIN_NAME, "purchaseSubscriptionOption", [
            subscriptionOption.productId,
            subscriptionOption.id,
            googleProductChangeInfo !== undefined && googleProductChangeInfo !== null ? googleProductChangeInfo.oldProductIdentifier : null,
            googleProductChangeInfo !== undefined && googleProductChangeInfo !== null
                ? googleProductChangeInfo.prorationMode
                : null,
            googleIsPersonalizedPrice,
            subscriptionOption.presentedOfferingIdentifier,
        ]);
    };
    /**
     * Restores a user's previous purchases and links their appUserIDs to any user's also using those purchases.
     * @param {function(CustomerInfo):void} callback Callback that will receive the new customer info after restoring transactions.
     * @param {function(PurchasesError):void} errorCallback Callback that will be triggered whenever there is any problem restoring the user transactions. This gets normally triggered if there
     * is an error retrieving the new customer info for the new user or the user cancelled the restore
     */
    Purchases.restorePurchases = function (callback, errorCallback) {
        window.cordova.exec(callback, errorCallback, PLUGIN_NAME, "restorePurchases", []);
    };
    /**
     * Get the appUserID that is currently in placed in the SDK
     * @param {function(string):void} callback Callback that will receive the current appUserID
     */
    Purchases.getAppUserID = function (callback) {
        window.cordova.exec(callback, null, PLUGIN_NAME, "getAppUserID", []);
    };
    /**
     * This function will logIn the current user with an appUserID. Typically this would be used after a log in
     * to identify a user without calling configure.
     * @param {String} appUserID The appUserID that should be linked to the currently user
     * @param {function(LogInResult):void} callback Callback that will receive an object that contains the customerInfo after logging in, as well as a boolean indicating
     * whether the user has just been created for the first time in the RevenueCat backend.
     * @param {function(PurchasesError):void} errorCallback Callback that will be triggered whenever there is any problem logging in.
     */
    Purchases.logIn = function (appUserID, callback, errorCallback) {
        // noinspection SuspiciousTypeOfGuard
        if (typeof appUserID !== "string") {
            throw new Error("appUserID needs to be a string");
        }
        window.cordova.exec(callback, errorCallback, PLUGIN_NAME, "logIn", [
            appUserID,
        ]);
    };
    /**
     * Logs out the Purchases client clearing the saved appUserID. This will generate a random user id and save it in the cache.
     * If the current user is already anonymous, this will produce a PurchasesError.
     * @param {function(CustomerInfo):void} callback Callback that will receive the new customer info after resetting
     * @param {function(PurchasesError):void} errorCallback Callback that will be triggered whenever there is an error when logging out.
     * This could happen for example if logOut is called but the current user is anonymous.
     */
    Purchases.logOut = function (callback, errorCallback) {
        window.cordova.exec(callback, errorCallback, PLUGIN_NAME, "logOut", []);
    };
    /**
     * Gets the current customer info. This call will return the cached customer info unless the cache is stale, in which case,
     * it will make a network call to retrieve it from the servers.
     * @param {function(CustomerInfo):void} callback Callback that will receive the customer info
     * @param {function(PurchasesError, boolean):void} errorCallback Callback that will be triggered whenever there is any problem retrieving the customer info
     */
    Purchases.getCustomerInfo = function (callback, errorCallback) {
        window.cordova.exec(callback, errorCallback, PLUGIN_NAME, "getCustomerInfo", []);
    };
    /**
     * Enables/Disables debugs logs
     * @param {boolean} enabled Enable or disable debug logs
     * @deprecated Use {@link setLogLevel} instead.
     */
    Purchases.setDebugLogsEnabled = function (enabled) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setDebugLogsEnabled", [
            enabled,
        ]);
    };
    /**
     * Used to set the log level. Useful for debugging issues with the lovely team @RevenueCat.
     * @param {LOG_LEVEL} level the minimum log level to enable.
     */
    Purchases.setLogLevel = function (level) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setLogLevel", [
            level,
        ]);
    };
    /**
     * Set a custom log handler for redirecting logs to your own logging system.
     * By default, this sends info, warning, and error messages.
     * If you wish to receive Debug level messages, see [setLogLevel].
     * @param {LogHandler} logHandler It will get called for each log event.
     * Use this function to redirect the log to your own logging system
     */
    Purchases.setLogHandler = function (logHandler) {
        window.cordova.exec(function (_a) {
            var logLevel = _a.logLevel, message = _a.message;
            var logLevelEnum = LOG_LEVEL[logLevel];
            logHandler(logLevelEnum, message);
        }, null, PLUGIN_NAME, "setLogHandler", []);
    };
    /**
     * iOS only.
     * @param {boolean} enabled Set this property to true *only* when testing the ask-to-buy / SCA purchases flow.
     * More information: http://errors.rev.cat/ask-to-buy
     */
    Purchases.setSimulatesAskToBuyInSandbox = function (enabled) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setSimulatesAskToBuyInSandbox", [
            enabled,
        ]);
    };
    /**
     * This method will send all the purchases to the RevenueCat backend. Call this when using your own implementation
     * for subscriptions anytime a sync is needed, like after a successful purchase.
     *
     * @warning This function should only be called if you're not calling makePurchase.
     */
    Purchases.syncPurchases = function () {
        window.cordova.exec(null, null, PLUGIN_NAME, "syncPurchases", []);
    };
    /**
     * @deprecated Use {@link syncAmazonPurchase} instead.
     * This method will send a purchase to the RevenueCat backend. This function should only be called if you are
     * in Amazon observer mode or performing a client side migration of your current users to RevenueCat.
     *
     * The receipt IDs are cached if successfully posted so they are not posted more than once.
     *
     * @param {string} productID Product ID associated to the purchase.
     * @param {string} receiptID ReceiptId that represents the Amazon purchase.
     * @param {string} amazonUserID Amazon's userID. This parameter will be ignored when syncing a Google purchase.
     * @param {(string|null|undefined)} isoCurrencyCode Product's currency code in ISO 4217 format.
     * @param {(number|null|undefined)} price Product's price.
     */
    Purchases.syncObserverModeAmazonPurchase = function (productID, receiptID, amazonUserID, isoCurrencyCode, price) {
        this.syncAmazonPurchase(productID, receiptID, amazonUserID, isoCurrencyCode, price);
    };
    /**
     * This method will send a purchase to the RevenueCat backend. This function should only be called if you are
     * in Amazon observer mode or performing a client side migration of your current users to RevenueCat.
     *
     * The receipt IDs are cached if successfully posted so they are not posted more than once.
     *
     * @param {string} productID Product ID associated to the purchase.
     * @param {string} receiptID ReceiptId that represents the Amazon purchase.
     * @param {string} amazonUserID Amazon's userID. This parameter will be ignored when syncing a Google purchase.
     * @param {(string|null|undefined)} isoCurrencyCode Product's currency code in ISO 4217 format.
     * @param {(number|null|undefined)} price Product's price.
     */
    Purchases.syncAmazonPurchase = function (productID, receiptID, amazonUserID, isoCurrencyCode, price) {
        window.cordova.exec(null, null, PLUGIN_NAME, "syncAmazonPurchase", [productID, receiptID, amazonUserID, isoCurrencyCode, price]);
    };
    /**
     * iOS only. Always returns an error on iOS < 15.
     *
     * Use this method only if you already have your own IAP implementation using StoreKit 2 and want to use
     * RevenueCat's backend. If you are using StoreKit 1 for your implementation, you do not need this method.
     *
     * You only need to use this method with *new* purchases. Subscription updates are observed automatically.
     *
     * Important: This should only be used if you have set PurchasesAreCompletedBy to MY_APP during SDK configuration.
     *
     * @warning You need to finish the transaction yourself after calling this method.
     *
     * @param {string} productID Product ID that was just purchased
     * @returns {Promise<PurchasesStoreTransaction>} If there was a transacton found and handled for the provided product ID.
     */
    Purchases.recordPurchase = function (productID, callback, errorCallback) {
        window.cordova.exec(callback, errorCallback, PLUGIN_NAME, "recordPurchase", [productID]);
    };
    /**
     * Enable automatic collection of Apple Search Ads attribution using AdServices. Disabled by default.
     */
    Purchases.enableAdServicesAttributionTokenCollection = function () {
        window.cordova.exec(null, null, PLUGIN_NAME, "enableAdServicesAttributionTokenCollection", []);
    };
    /**
     * @param {function(boolean):void} callback Will be sent a boolean indicating if the `appUserID` has been generated
     * by RevenueCat or not.
     */
    Purchases.isAnonymous = function (callback) {
        window.cordova.exec(callback, null, PLUGIN_NAME, "isAnonymous", []);
    };
    /**
     *  iOS only. Computes whether or not a user is eligible for the introductory pricing period of a given product.
     *  You should use this method to determine whether or not you show the user the normal product price or the
     *  introductory price. This also applies to trials (trials are considered a type of introductory pricing).
     *
     *  @note Subscription groups are automatically collected for determining eligibility. If RevenueCat can't
     *  definitively compute the eligibility, most likely because of missing group information, it will return
     *  `INTRO_ELIGIBILITY_STATUS_UNKNOWN`. The best course of action on unknown status is to display the non-intro
     *  pricing, to not create a misleading situation. To avoid this, make sure you are testing with the latest version of
     *  iOS so that the subscription group can be collected by the SDK. Android always returns INTRO_ELIGIBILITY_STATUS_UNKNOWN.
     *
     *  @param productIdentifiers Array of product identifiers for which you want to compute eligibility
     *  @param callback Will be sent a map of IntroEligibility per productId
     */
    Purchases.checkTrialOrIntroductoryPriceEligibility = function (productIdentifiers, callback) {
        window.cordova.exec(callback, null, PLUGIN_NAME, "checkTrialOrIntroductoryPriceEligibility", [productIdentifiers]);
    };
    /**
     * Sets a function to be called on purchases initiated on the Apple App Store. This is only used in iOS.
     * @param {ShouldPurchasePromoProductListener} shouldPurchasePromoProductListener Called when a user initiates a
     * promotional in-app purchase from the App Store. If your app is able to handle a purchase at the current time, run
     * the deferredPurchase function. If the app is not in a state to make a purchase: cache the deferredPurchase, then
     * call the deferredPurchase when the app is ready to make the promotional purchase.
     * If the purchase should never be made, you don't need to ever call the deferredPurchase and the app will not
     * proceed with promotional purchases.
     */
    Purchases.addShouldPurchasePromoProductListener = function (shouldPurchasePromoProductListener) {
        if (typeof shouldPurchasePromoProductListener !== "function") {
            throw new Error("addShouldPurchasePromoProductListener needs a function");
        }
        shouldPurchasePromoProductListeners.push(shouldPurchasePromoProductListener);
    };
    /**
     * Removes a given ShouldPurchasePromoProductListener
     * @param {ShouldPurchasePromoProductListener} listenerToRemove ShouldPurchasePromoProductListener reference of the listener to remove
     * @returns {boolean} True if listener was removed, false otherwise
     */
    Purchases.removeShouldPurchasePromoProductListener = function (listenerToRemove) {
        if (shouldPurchasePromoProductListeners.indexOf(listenerToRemove) !== -1) {
            shouldPurchasePromoProductListeners = shouldPurchasePromoProductListeners.filter(function (listener) { return listenerToRemove !== listener; });
            return true;
        }
        return false;
    };
    /**
     * Invalidates the cache for customer information.
     *
     * Most apps will not need to use this method; invalidating the cache can leave your app in an invalid state.
     * Refer to https://docs.revenuecat.com/docs/customer-info#section-get-user-information for more information on
     * using the cache properly.
     *
     * This is useful for cases where customer information might have been updated outside of the
     * app, like if a promotional subscription is granted through the RevenueCat dashboard.
     */
    Purchases.invalidateCustomerInfoCache = function () {
        window.cordova.exec(null, null, PLUGIN_NAME, "invalidateCustomerInfoCache", []);
    };
    /**
     * iOS only. Presents a code redemption sheet, useful for redeeming offer codes
     * Refer to https://docs.revenuecat.com/docs/ios-subscription-offers#offer-codes for more information on how
     * to configure and use offer codes.
     */
    Purchases.presentCodeRedemptionSheet = function () {
        window.cordova.exec(null, null, PLUGIN_NAME, "presentCodeRedemptionSheet", []);
    };
    /**
     * Subscriber attributes are useful for storing additional, structured information on a user.
     * Since attributes are writable using a public key they should not be used for
     * managing secure or sensitive information such as subscription status, coins, etc.
     *
     * Key names starting with "$" are reserved names used by RevenueCat. For a full list of key
     * restrictions refer to our guide: https://docs.revenuecat.com/docs/subscriber-attributes
     *
     * @param attributes Map of attributes by key. Set the value as an empty string to delete an attribute.
     */
    Purchases.setAttributes = function (attributes) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setAttributes", [attributes]);
    };
    /**
     * Subscriber attribute associated with the email address for the user
     *
     * @param email Empty String or null will delete the subscriber attribute.
     */
    Purchases.setEmail = function (email) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setEmail", [email]);
    };
    /**
     * Subscriber attribute associated with the phone number for the user
     *
     * @param phoneNumber Empty String or null will delete the subscriber attribute.
     */
    Purchases.setPhoneNumber = function (phoneNumber) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setPhoneNumber", [phoneNumber]);
    };
    /**
     * Subscriber attribute associated with the display name for the user
     *
     * @param displayName Empty String or null will delete the subscriber attribute.
     */
    Purchases.setDisplayName = function (displayName) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setDisplayName", [displayName]);
    };
    /**
     * Subscriber attribute associated with the push token for the user
     *
     * @param pushToken Empty String or null will delete the subscriber attribute.
     */
    Purchases.setPushToken = function (pushToken) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setPushToken", [pushToken]);
    };
    /**
     * Subscriber attribute associated with the Adjust Id for the user
     * Required for the RevenueCat Adjust integration
     *
     * @param adjustID Empty String or null will delete the subscriber attribute.
     */
    Purchases.setAdjustID = function (adjustID) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setAdjustID", [adjustID]);
    };
    /**
     * Subscriber attribute associated with the AppsFlyer Id for the user
     * Required for the RevenueCat AppsFlyer integration
     * @param appsflyerID Empty String or null will delete the subscriber attribute.
     */
    Purchases.setAppsflyerID = function (appsflyerID) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setAppsflyerID", [appsflyerID]);
    };
    /**
     * Subscriber attribute associated with the Facebook SDK Anonymous Id for the user
     * Recommended for the RevenueCat Facebook integration
     *
     * @param fbAnonymousID Empty String or null will delete the subscriber attribute.
     */
    Purchases.setFBAnonymousID = function (fbAnonymousID) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setFBAnonymousID", [fbAnonymousID]);
    };
    /**
     * Subscriber attribute associated with the mParticle Id for the user
     * Recommended for the RevenueCat mParticle integration
     *
     * @param mparticleID Empty String or null will delete the subscriber attribute.
     */
    Purchases.setMparticleID = function (mparticleID) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setMparticleID", [mparticleID]);
    };
    /**
     * Subscriber attribute associated with the OneSignal Player Id for the user
     * Required for the RevenueCat OneSignal integration
     *
     * @param onesignalID Empty String or null will delete the subscriber attribute.
     */
    Purchases.setOnesignalID = function (onesignalID) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setOnesignalID", [onesignalID]);
    };
    /**
     * Subscriber attribute associated with the Airship Channel Id for the user
     * Required for the RevenueCat Airship integration
     *
     * @param airshipChannelID Empty String or null will delete the subscriber attribute.
     */
    Purchases.setAirshipChannelID = function (airshipChannelID) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setAirshipChannelID", [airshipChannelID]);
    };
    /**
     * Subscriber attribute associated with the Firebase App Instance ID for the user
     * Required for the RevenueCat Firebase integration
     *
     * @param firebaseAppInstanceID Empty String or null will delete the subscriber attribute.
     */
    Purchases.setFirebaseAppInstanceID = function (firebaseAppInstanceID) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setFirebaseAppInstanceID", [firebaseAppInstanceID]);
    };
    /**
     * Subscriber attribute associated with the Mixpanel Distinct ID for the user
     * Required for the RevenueCat Mixpanel integration
     *
     * @param mixpanelDistinctID Empty String or null will delete the subscriber attribute.
     */
    Purchases.setMixpanelDistinctID = function (mixpanelDistinctID) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setMixpanelDistinctID", [mixpanelDistinctID]);
    };
    /**
     * Subscriber attribute associated with the CleverTap ID for the user
     * Required for the RevenueCat CleverTap integration
     *
     * @param cleverTapID Empty String or null will delete the subscriber attribute.
     */
    Purchases.setCleverTapID = function (cleverTapID) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setCleverTapID", [cleverTapID]);
    };
    /**
     * Subscriber attribute associated with the install media source for the user
     *
     * @param mediaSource Empty String or null will delete the subscriber attribute.
     */
    Purchases.setMediaSource = function (mediaSource) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setMediaSource", [mediaSource]);
    };
    /**
     * Subscriber attribute associated with the install campaign for the user
     *
     * @param campaign Empty String or null will delete the subscriber attribute.
     */
    Purchases.setCampaign = function (campaign) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setCampaign", [campaign]);
    };
    /**
     * Subscriber attribute associated with the install ad group for the user
     *
     * @param adGroup Empty String or null will delete the subscriber attribute.
     */
    Purchases.setAdGroup = function (adGroup) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setAdGroup", [adGroup]);
    };
    /**
     * Subscriber attribute associated with the install ad for the user
     *
     * @param ad Empty String or null will delete the subscriber attribute.
     */
    Purchases.setAd = function (ad) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setAd", [ad]);
    };
    /**
     * Subscriber attribute associated with the install keyword for the user
     *
     * @param keyword Empty String or null will delete the subscriber attribute.
     */
    Purchases.setKeyword = function (keyword) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setKeyword", [keyword]);
    };
    /**
     * Subscriber attribute associated with the install ad creative for the user
     *
     * @param creative Empty String or null will delete the subscriber attribute.
     */
    Purchases.setCreative = function (creative) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setCreative", [creative]);
    };
    /**
     * Automatically collect subscriber attributes associated with the device identifiers.
     * $idfa, $idfv, $ip on iOS
     * $gpsAdId, $androidId, $ip on Android
     */
    Purchases.collectDeviceIdentifiers = function () {
        window.cordova.exec(null, null, PLUGIN_NAME, "collectDeviceIdentifiers", []);
    };
    /**
     * Set this property to your proxy URL before configuring Purchases *only* if you've received a proxy key value from your RevenueCat contact.
     * @param url Proxy URL as a string.
     */
    Purchases.setProxyURL = function (url) {
        window.cordova.exec(null, null, PLUGIN_NAME, "setProxyURLString", [url]);
    };
    /**
     * Check if billing is supported for the current user (meaning IN-APP purchases are supported)
     * and optionally, whether a list of specified feature types are supported.
     *
     * Note: Billing features are only relevant to Google Play Android users.
     * For other stores and platforms, billing features won't be checked.
     * @param {[BILLING_FEATURE]} features An array of feature types to check for support. Feature types must be one of
     * [BILLING_FEATURE]. By default, is an empty list and no specific feature support will be checked.
     * @param {function(boolean):void} callback Will be sent true if billing is supported, false otherwise.
     * @param {function(PurchasesError):void} errorCallback Callback triggered after an error or when checking if billing
     * is supported.
     */
    Purchases.canMakePayments = function (features, callback, errorCallback) {
        if (features === void 0) { features = []; }
        window.cordova.exec(callback, errorCallback, PLUGIN_NAME, "canMakePayments", [features]);
    };
    /**
     * iOS 15+ only. Presents a refund request sheet in the current window scene for
     * the latest transaction associated with the active entitlement.
     *
     * If the request was unsuccessful, no active entitlements could be found for
     * the user, or multiple active entitlements were found for the user,
     * the promise will return an error.
     * If called in an unsupported platform (iOS < 15), an `unsupportedError` will be sent to the callback.
     *
     * Important: This method should only be used if your user can only have a single active entitlement at a given time.
     * If a user could have more than one entitlement at a time, use `beginRefundRequestForEntitlement` instead.
     *
     * @param {function(REFUND_REQUEST_STATUS):void} callback REFUND_REQUEST_STATUS: The status of the refund request.
     * Keep in mind the status could be REFUND_REQUEST_STATUS.USER_CANCELLED
     * @param {function(PurchasesError):void} errorCallback Callback triggered after an error when beginning refund
     * request for active entitlement.
     */
    Purchases.beginRefundRequestForActiveEntitlement = function (callback, errorCallback) {
        window.cordova.exec(function (refundRequestStatusInt) {
            var refundRequestStatus = Purchases.convertIntToRefundRequestStatus(refundRequestStatusInt);
            callback(refundRequestStatus);
        }, errorCallback, PLUGIN_NAME, "beginRefundRequestForActiveEntitlement", []);
    };
    /**
     * iOS 15+ only. Presents a refund request sheet in the current window scene for
     * the latest transaction associated with the `entitlement`.
     *
     * If the request was unsuccessful, the promise will return an error.
     * If called in an unsupported platform (iOS < 15), an `unsupportedError` will be sent to the callback.
     *
     * @param entitlementInfo The entitlement to begin a refund request for.
     * @param {function(REFUND_REQUEST_STATUS):void} callback REFUND_REQUEST_STATUS: The status of the refund request.
     * Keep in mind the status could be REFUND_REQUEST_STATUS.USER_CANCELLED
     * @param {function(PurchasesError):void} errorCallback Callback triggered after an error when beginning refund
     * request for an entitlement.
     */
    Purchases.beginRefundRequestForEntitlement = function (entitlementInfo, callback, errorCallback) {
        window.cordova.exec(function (refundRequestStatusInt) {
            var refundRequestStatus = Purchases.convertIntToRefundRequestStatus(refundRequestStatusInt);
            callback(refundRequestStatus);
        }, errorCallback, PLUGIN_NAME, "beginRefundRequestForEntitlementId", [entitlementInfo.identifier]);
    };
    /**
     * iOS 15+ only. Presents a refund request sheet in the current window scene for
     * the latest transaction associated with the `product`.
     *
     * If the request was unsuccessful, the promise will return an error.
     * If called in an unsupported platform (iOS < 15), an `unsupportedError` will be sent to the callback.
     *
     * @param storeProduct The StoreProduct to begin a refund request for.
     * @param {function(REFUND_REQUEST_STATUS):void} callback REFUND_REQUEST_STATUS: The status of the refund request.
     * Keep in mind the status could be REFUND_REQUEST_STATUS.USER_CANCELLED
     * @param {function(PurchasesError):void} errorCallback Callback triggered after an error when beginning refund
     * request for a product.
     */
    Purchases.beginRefundRequestForProduct = function (storeProduct, callback, errorCallback) {
        window.cordova.exec(function (refundRequestStatusInt) {
            var refundRequestStatus = Purchases.convertIntToRefundRequestStatus(refundRequestStatusInt);
            callback(refundRequestStatus);
        }, errorCallback, PLUGIN_NAME, "beginRefundRequestForProductId", [storeProduct.identifier]);
    };
    /**
     * Shows in-app messages available from the App Store or Google Play. You need to disable messages from showing
     * automatically using [PurchasesConfiguration.shouldShowInAppMessagesAutomatically].
     *
     * Note: In iOS, this requires version 16+. In older versions the promise will be resolved successfully
     * immediately.
     *
     * @param messageTypes An array of message types that the stores can display inside your app. Must be one of
     *       [IN_APP_MESSAGE_TYPE]. By default, is undefined and all message types will be shown.
     */
    Purchases.showInAppMessages = function (messageTypes) {
        window.cordova.exec(null, null, PLUGIN_NAME, "showInAppMessages", [messageTypes]);
    };
    /**
     * Fetches the virtual currencies for the current subscriber.
     *
     * @param {function(PurchasesVirtualCurrencies):void} callback Callback that will receive the subscriber's virtual currencies.
     * @param {function(PurchasesError):void} errorCallback Callback that will be triggered whenever there is a problem retrieving the subscriber's virtual currencies.
     */
    Purchases.getVirtualCurrencies = function (callback, errorCallback) {
        window.cordova.exec(callback, errorCallback, PLUGIN_NAME, "getVirtualCurrencies", []);
    };
    /**
     * Invalidates the cache for virtual currencies.
     *
     * This is useful for cases where a virtual currency's balance might have been updated
     * outside of the app, like if you decreased a user's balance from the user spending a virtual currency,
     * or if you increased the balance from your backend using the server APIs.
     */
    Purchases.invalidateVirtualCurrenciesCache = function () {
        window.cordova.exec(null, null, PLUGIN_NAME, "invalidateVirtualCurrenciesCache", []);
    };
    /**
     * The currently cached `PurchasesVirtualCurrencies` if one is available.
     * This value will remain null until virtual currencies have been fetched at
     * least once with `Purchases.getVirtualCurrencies` or an equivalent function.
     *
     * @param {function(PurchasesVirtualCurrencies):void} callback Callback that will be triggered with the currently cached virtual currencies for the current subscriber.
     */
    Purchases.getCachedVirtualCurrencies = function (callback) {
        return window.cordova.exec(callback, null, PLUGIN_NAME, "getCachedVirtualCurrencies", []);
    };
    Purchases.setupShouldPurchasePromoProductCallback = function () {
        var _this = this;
        window.cordova.exec(function (_a) {
            var callbackID = _a.callbackID;
            shouldPurchasePromoProductListeners.forEach(function (listener) {
                return listener(_this.getMakeDeferredPurchaseFunction(callbackID));
            });
        }, null, PLUGIN_NAME, "setupShouldPurchasePromoProductCallback", []);
    };
    Purchases.getMakeDeferredPurchaseFunction = function (callbackID) {
        return function () { return window.cordova.exec(null, null, PLUGIN_NAME, "makeDeferredPurchase", [callbackID]); };
    };
    Purchases.convertIntToRefundRequestStatus = function (refundRequestStatusInt) {
        switch (refundRequestStatusInt) {
            case 0:
                return REFUND_REQUEST_STATUS.SUCCESS;
            case 1:
                return REFUND_REQUEST_STATUS.USER_CANCELLED;
            default:
                return REFUND_REQUEST_STATUS.ERROR;
        }
    };
    Purchases.isPurchasesAreCompletedByMyApp = function (obj) {
        return (typeof obj === "object" &&
            obj !== null &&
            obj.type ===
                PURCHASES_ARE_COMPLETED_BY_TYPE.MY_APP);
    };
    /**
     * Enum for attribution networks
     * @readonly
     * @enum {Number}
     */
    Purchases.ATTRIBUTION_NETWORK = ATTRIBUTION_NETWORK;
    /**
     * Supported SKU types.
     * @readonly
     * @enum {string}
     */
    Purchases.PURCHASE_TYPE = PURCHASE_TYPE;
    /**
     * Supported product categories.
     * @readonly
     * @enum {string}
     */
    Purchases.PRODUCT_CATEGORY = PRODUCT_CATEGORY;
    /**
     * Enum for billing features.
     * Currently, these are only relevant for Google Play Android users:
     * https://developer.android.com/reference/com/android/billingclient/api/BillingClient.FeatureType
     */
    Purchases.BILLING_FEATURE = BILLING_FEATURE;
    /**
     * Enum with possible return states for beginning refund request.
     * @readonly
     * @enum {string}
     */
    Purchases.REFUND_REQUEST_STATUS = REFUND_REQUEST_STATUS;
    /**
     * Replace SKU's ProrationMode.
     * @readonly
     * @enum {number}
     */
    Purchases.PRORATION_MODE = PRORATION_MODE;
    /**
     * Enumeration of all possible Package types.
     * @readonly
     * @enum {string}
     */
    Purchases.PACKAGE_TYPE = PACKAGE_TYPE;
    /**
     * Enum of different possible states for intro price eligibility status.
     * @readonly
     * @enum {number}
     */
    Purchases.INTRO_ELIGIBILITY_STATUS = INTRO_ELIGIBILITY_STATUS;
    /**
     * Enum of different possible log levels.
     * @readonly
     * @enum {string}
     */
    Purchases.LOG_LEVEL = LOG_LEVEL;
    /**
     * Enum of different possible in-app message types.
     * @readonly
     * @enum {string}
     */
    Purchases.IN_APP_MESSAGE_TYPE = IN_APP_MESSAGE_TYPE;
    /**
     * Modes for completing the purchase process.
     * @readonly
     * @enum {string}
     */
    Purchases.PURCHASES_ARE_COMPLETED_BY_TYPE = PURCHASES_ARE_COMPLETED_BY_TYPE;
    /**
     * Defines which version of StoreKit may be used.
     * @readonly
     * @enum {string}
     */
    Purchases.STOREKIT_VERSION = STOREKIT_VERSION;
    return Purchases;
}());
if (!window.plugins) {
    window.plugins = {};
}
if (!window.plugins.Purchases) {
    window.plugins.Purchases = new Purchases();
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = Purchases;
}
exports.default = Purchases;

});

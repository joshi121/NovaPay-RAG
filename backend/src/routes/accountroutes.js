import express from "express"
import { registerAccount, getUserAccountsController, getAccountBalanceController } from "../controllors/accountcontrollor.js";
import { isAunthenticated } from "../middleware/authmiddleware.js";

const AccountRouter = express.Router();

AccountRouter.route("/").post(isAunthenticated , registerAccount);

/**
 * - GET /api/accounts/
 * - Get all accounts of the logged-in user
 * - Protected Route
 */
AccountRouter.route("/").get( isAunthenticated, getUserAccountsController)


/**
 * - GET /api/accounts/balance/:accountId
 */
AccountRouter.route("/balance/:accountId").get(isAunthenticated, getAccountBalanceController);

export default AccountRouter;
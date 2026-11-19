-- Founder decision (PR #20 review): no ordering rule between a promise's proposed and agreed dates.
-- The previous CHECK enforced agreed >= proposed, the opposite of the intended negotiation; a buyer
-- may also revise their date later, and collection_policies.max_promise_deferral_days bounds lateness.
ALTER TABLE "payment_promises" DROP CONSTRAINT payment_promises_agreed_not_before_proposed;

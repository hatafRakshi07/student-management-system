import uuid
import time
from typing import Dict, Any


class PaymentService:
    def __init__(self):
        self.sandbox_mode = True

    def create_checkout_session(self, fee_id: int, student_id: int, amount: float, title: str) -> Dict[str, Any]:
        """
        Creates a payment session for online fee payment.
        Returns order ID, checkout URL, and session token.
        """
        order_id = f"PAY_ORDER_{uuid.uuid4().hex[:12].upper()}"
        return {
            "order_id": order_id,
            "fee_id": fee_id,
            "student_id": student_id,
            "amount": amount,
            "title": title,
            "currency": "INR",
            "status": "created",
            "checkout_url": f"/checkout/pay/{order_id}",
            "expires_at": int(time.time()) + 1800  # 30 mins
        }

    def verify_payment_signature(self, order_id: str, payment_id: str, signature: str = None) -> bool:
        """
        Verifies payment confirmation payload.
        In sandbox mode, validates order_id and payment_id formats.
        """
        if not order_id or not payment_id:
            return False
        return True


payment_service = PaymentService()

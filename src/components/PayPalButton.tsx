import React from "react";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";

interface PayPalButtonProps {
  amount: string;
  onSuccess?: (details: any) => void;
  onError?: (error: any) => void;
}

export const PayPalButton: React.FC<PayPalButtonProps> = ({ amount, onSuccess, onError }) => {
  const [{ isPending }] = usePayPalScriptReducer();

  const createOrder = async () => {
    try {
      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      const order = await response.json();
      if (order.id) {
        return order.id;
      } else {
        const errorDetail = order?.details?.[0];
        const errorMessage = errorDetail
          ? `${errorDetail.issue} ${errorDetail.description} (${order.debug_id})`
          : JSON.stringify(order);

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("PayPal Create Order Error:", error);
      if (onError) onError(error);
      throw error;
    }
  };

  const onApprove = async (data: any, actions: any) => {
    try {
      const response = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderID: data.orderID }),
      });

      const details = await response.json();
      
      const errorDetail = details?.details?.[0];
      if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
        return actions.restart();
      } else if (errorDetail) {
        throw new Error(`${errorDetail.description} (${details.debug_id})`);
      } else {
        if (onSuccess) onSuccess(details);
      }
    } catch (error) {
      console.error("PayPal Capture Order Error:", error);
      if (onError) onError(error);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {isPending && <div className="animate-pulse bg-gray-200 h-12 rounded-md mb-4"></div>}
      <PayPalButtons
        style={{ layout: "vertical" }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={(err) => {
          console.error("PayPal Button Error:", err);
          if (onError) onError(err);
        }}
      />
    </div>
  );
};

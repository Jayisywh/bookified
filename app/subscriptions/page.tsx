import { PricingTable } from "@clerk/nextjs";
import React from "react";

const SubscriptionsPage = () => {
  return (
    <main className="wrapper container">
      <div className="mx-auto max-w-4xl space-y-10">
        <section className="flex flex-col gap-5 text-center">
          <h1 className="page-title-xl">Choose Your Plan</h1>
          <p className="subtitle">
            Unlock more books and longer conversations with our premium plans
          </p>
        </section>

        <div className="flex justify-center">
          <PricingTable
            appearance={{
              baseTheme: undefined,
              variables: {
                colorPrimary: "#212a3b",
                colorBackground: "#ffffff",
                colorInputBackground: "#f8f9fa",
                colorInputText: "#212a3b",
                colorText: "#212a3b",
                borderRadius: "8px",
              },
              elements: {
                card: "shadow-lg border border-gray-200",
                pricingTable:
                  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
                pricingTableItem: "border border-gray-200 rounded-lg p-6",
                pricingTableItemTitle: "text-xl font-semibold text-gray-900",
                pricingTableItemPrice: "text-3xl font-bold text-primary",
                pricingTableItemFeature: "text-gray-600",
                button:
                  "bg-primary hover:bg-primary/90 text-white font-medium px-6 py-3 rounded-md transition-colors",
              },
            }}
          />
        </div>
      </div>
    </main>
  );
};

export default SubscriptionsPage;

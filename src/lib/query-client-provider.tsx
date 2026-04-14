"use client";

import {
  QueryClient,
  QueryClientProvider as Provider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { POLL_INTERVAL_MS } from "./constants";

export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: POLL_INTERVAL_MS,
            refetchInterval: POLL_INTERVAL_MS,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );
  return (
    <Provider client={client}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </Provider>
  );
}

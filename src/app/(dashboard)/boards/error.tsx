"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

type BoardsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function BoardsError({ error, reset }: BoardsErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
      <p className="text-sm text-red-700 dark:text-red-400">
        Board sayfasi yuklenirken hata olustu.
      </p>
      <div className="mt-3">
        <Button type="button" variant="secondary" onClick={reset}>
          Tekrar Dene
        </Button>
      </div>
    </section>
  );
}

import { describe, expect, it, vi } from "vitest";
import {
  MovimentacaoImmutabilityError,
  movimentacaoQueryGuard,
} from "./prisma-guards";

describe("movimentacaoQueryGuard", () => {
  it.each(["update", "updateMany", "upsert", "delete", "deleteMany"] as const)(
    "blocks %s on Movimentacao without calling query",
    async (operation) => {
      const query = vi.fn();

      await expect(
        movimentacaoQueryGuard({ operation, args: {}, query })
      ).rejects.toThrow(MovimentacaoImmutabilityError);

      expect(query).not.toHaveBeenCalled();
    }
  );

  it.each(["create", "createMany", "findMany", "findUnique", "count"] as const)(
    "allows %s on Movimentacao and forwards args to query",
    async (operation) => {
      const expected = { id: "mov-1" };
      const args = { where: { id: "mov-1" } };
      const query = vi.fn().mockResolvedValue(expected);

      const result = await movimentacaoQueryGuard({ operation, args, query });

      expect(result).toEqual(expected);
      expect(query).toHaveBeenCalledWith(args);
    }
  );
});

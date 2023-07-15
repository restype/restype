import { z } from "zod";
import { createContract } from "./lib/contract";
import { createRouter } from "./lib/router";

const contract = createContract({
  getTodo: {
    method: "GET",
    path: "/task/:id",
    responses: {
      200: z.object({
        title: z.string(),
      }),
      400: z.string(),
    },
  },
  createTodo: {
    method: "POST",
    path: "/task/",
    body: z.object({ n: z.number() }),
    responses: {
      204: z.string(),
    },
  },
});

const getTodo = async ({ params }: { params: { id: string } }) => {
  return {
    status: 200 as const,
    body: {
      title: "title",
    },
  };
};

const createTodo = async ({ body }: { body: { n: number } }) => {
  return {
    status: 204 as const,
    body: "asdf",
  };
};

const router = createRouter(contract, {
  getTodo,
  createTodo,
});

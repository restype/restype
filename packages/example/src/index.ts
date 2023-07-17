import { z } from "zod";
import { createContract, createRouter } from "@typesafe-rest/core";
import { createClient } from "@typesafe-rest/client";

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

const createContext = async () => {
  const session = { userId: 1 };

  return {
    session,
  };
};

const router = createRouter(contract, createContext, {
  getTodo: async ({
    params: { id },
    headers,
    ctx: {
      session: { userId },
    },
  }) => {
    console.log(id);
    console.log(userId);

    return {
      status: 200 as const,
      body: {
        title: "title",
      },
    };
  },
  createTodo: async ({
    body: { n },
    headers,
    ctx: {
      session: { userId },
    },
  }) => {
    console.log(n);
    console.log(userId);

    return {
      status: 204 as const,
      body: "asdf",
    };
  },
});

const client = createClient(contract);
const { data } = client.createTodo();

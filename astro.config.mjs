import { defineConfig } from 'astro/config';
import icon from "astro-icon";

export default defineConfig({
  integrations: [icon({
    include: {
      'simple-icons': ["*"],
      'mdi': ["*"],
    },
  })],
});
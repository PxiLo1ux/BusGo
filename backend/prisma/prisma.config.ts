import { defineConfig } from '@prisma/config';

export default defineConfig({
    datasources: {
        db: {
            provider: "postgresql",
            url: "postgresql://postgres:Dikshya11@localhost:5433/busgo",
        },
    },
});

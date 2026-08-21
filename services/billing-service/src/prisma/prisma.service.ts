import { Injectable, OnModuleInit, OnModuleDestroy, BadRequestException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private _extendedClient: any;

  constructor() {
    super();

    const modelDateFieldMap: Record<string, string> = {
      LedgerEntry: "entryDate",
      Invoice: "issueDate",
      Payment: "paymentDate",
      Expense: "date",
      CreditNote: "issueDate",
      DebitNote: "issueDate",
      CogsPosting: "createdAt",
      RevenueScheduleItem: "recognitionDate",
    };

    const lockedModels = Object.keys(modelDateFieldMap);

    this._extendedClient = this.$extends({
      query: {
        $allModels: {
          $allOperations: async ({ model, operation, args, query }: any) => {
            if (
              model &&
              lockedModels.includes(model) &&
              ["create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany"].includes(operation)
            ) {
              const dateField = modelDateFieldMap[model];
              const dbModelName = model.charAt(0).toLowerCase() + model.slice(1);

              const checkDateAndOrg = async (orgId: number, dateVal: any) => {
                if (!orgId || !dateVal) return;
                const parsedDate = new Date(dateVal);
                if (isNaN(parsedDate.getTime())) return;

                const closedPeriod = await (this as any).fiscalPeriod.findFirst({
                  where: {
                    organizationId: orgId,
                    startDate: { lte: parsedDate },
                    endDate: { gte: parsedDate },
                    isClosed: true,
                  },
                });

                if (closedPeriod) {
                  throw new BadRequestException(
                    `Cannot perform operations in a closed period. Date ${parsedDate.toISOString().split("T")[0]} falls within closed period "${closedPeriod.label}".`
                  );
                }
              };

              // For creations: inspect args.data
              if (operation === "create") {
                const data = args.data;
                if (data) {
                  await checkDateAndOrg(data.organizationId, data[dateField]);
                }
              } else if (operation === "createMany") {
                const dataList = args.data;
                if (Array.isArray(dataList)) {
                  for (const data of dataList) {
                    await checkDateAndOrg(data.organizationId, data[dateField]);
                  }
                } else if (dataList) {
                  const dataListObj = dataList as any;
                  if (dataListObj && typeof dataListObj === 'object') {
                    if (Array.isArray(dataListObj)) {
                      for (const data of dataListObj) {
                        await checkDateAndOrg(data.organizationId, data[dateField]);
                      }
                    } else if (dataListObj.data && Array.isArray(dataListObj.data)) {
                      for (const data of dataListObj.data) {
                        await checkDateAndOrg(data.organizationId, data[dateField]);
                      }
                    } else {
                      await checkDateAndOrg(dataListObj.organizationId, dataListObj[dateField]);
                    }
                  }
                }
              } else if (["update", "upsert", "delete"].includes(operation)) {
                // Retrieve the existing record to check its date/org
                const existing = await (this as any)[dbModelName].findUnique({
                  where: args.where,
                });
                if (existing) {
                  await checkDateAndOrg(existing.organizationId, existing[dateField]);
                  // Also check the new date if it's being updated
                  if (operation === "update" && args.data && args.data[dateField]) {
                    await checkDateAndOrg(existing.organizationId, args.data[dateField]);
                  } else if (operation === "upsert" && args.update && args.update[dateField]) {
                    await checkDateAndOrg(existing.organizationId, args.update[dateField]);
                  }
                }
              } else if (["updateMany", "deleteMany"].includes(operation)) {
                // Retrieve matching records to check their dates/orgs
                const existings = await (this as any)[dbModelName].findMany({
                  where: args.where,
                });
                for (const existing of existings) {
                  await checkDateAndOrg(existing.organizationId, existing[dateField]);
                  if (operation === "updateMany" && args.data && args.data[dateField]) {
                    await checkDateAndOrg(existing.organizationId, args.data[dateField]);
                  }
                }
              }
            }
            return query(args);
          },
        },
      },
    });

    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (prop in target) {
          const val = Reflect.get(target, prop, receiver);
          if (typeof val === 'function') {
            return val.bind(target);
          }
          return val;
        }
        const val = Reflect.get(target._extendedClient, prop);
        if (typeof val === 'function') {
          return val.bind(target._extendedClient);
        }
        return val;
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

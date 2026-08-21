import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("health")
  getHealth(): any {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}

import { Module, Global } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthGuard } from "./auth.guard";
import { PermissionsGuard } from "./permissions.guard";

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [AuthGuard, PermissionsGuard],
  exports: [JwtModule, AuthGuard, PermissionsGuard],
})
export class AuthModule {}

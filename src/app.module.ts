import { Module } from '@nestjs/common';
import {ConfigModule} from '@nestjs/config'
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, //This enables the Config for all modules inside the project.
      expandVariables:true, //THis allows you to use: ${variable} in your .env to insert variables as values.
    }),
    UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}



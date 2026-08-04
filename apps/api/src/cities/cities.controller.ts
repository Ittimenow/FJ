import { Controller, Get, Query } from "@nestjs/common";
import { CitiesService } from "./cities.service";

@Controller("cities")
export class CitiesController {
  constructor(private readonly cities: CitiesService) {}

  @Get()
  search(@Query("query") query?: string) {
    return this.cities.search(typeof query === "string" ? query : "");
  }
}

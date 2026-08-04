import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export const CITY_QUERY_MAX_LENGTH = 80;

export function normalizeCityQuery(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
}

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async search(rawQuery: string) {
    const query = normalizeCityQuery(rawQuery);
    if (!query) return [];
    if (query.length > CITY_QUERY_MAX_LENGTH) {
      throw new BadRequestException("Название города слишком длинное.");
    }

    return this.prisma.city.findMany({
      where: { searchName: { startsWith: query } },
      select: { id: true, name: true, region: true },
      orderBy: [{ name: "asc" }, { region: "asc" }],
      take: 20
    });
  }
}

import { Injectable } from "@angular/core";

export class TranslationSet {
  public language: string;
  public values: { [key: string]: string } = {};
}

@Injectable({
  providedIn: "root",
})
export class TranslationService {
  private dictionary: { [key: string]: TranslationSet } = {
    it: {
      language: "it",
      values: {
        indicator: "indicatore",
        "time period": "intervallo temporale",
        "reference period": "periodo di riferimento",
        "territorial units": "unità territoriali",
        "anomaly of": "Anomalia della",
        "annual mean temperature": "temperatura media annuale",
        "winter mean temperature": "temperatura media invernale",
        "spring mean temperature": "temperatura media primaverile",
        "summer mean temperature": "temperatura media estiva",
        "autumn mean temperature": "temperatura media autunnale",
        "annual minimum temperature": "temperatura minima annuale",
        "winter minimum temperature": "temperatura minima invernale",
        "spring minimum temperature": "temperatura minima primaverile",
        "summer minimum temperature": "temperatura minima estiva",
        "autumn minimum temperature": "temperatura minima autunnale",
        "annual maximum temperature": "temperatura massima annuale",
        "winter maximum temperature": "temperatura massima invernale",
        "spring maximum temperature": "temperatura massima primaverile",
        "summer maximum temperature": "temperatura massima estiva",
        "autumn maximum temperature": "temperatura massima autunnale",
        ann: "Annuale",
        djf: "Inverno (Dic-Gen-Feb)",
        mam: "Primavera (Mar-Apr-Mag)",
        jja: "Estate (Giu-Lug-Ago)",
        son: "Autunno (Set-Ott-Nov)",
        t_2m: "temperatura media dell'aria a 2m",
        tmax_2m: "temperatura massima dell'aria a 2m",
        tmin_2m: "temperatura minima dell'aria 2m",
        "no stripes available": "nessuna stripe disponibile",
        "try to apply a different set of filters":
          "prova ad applicare un diverso set di filtri",
        "downscaling of era5 @2.2 km over italy":
          "Downscaling di ERA5 @2.2 km sull'Italia",
      },
    },
    en: {
      language: "en",
      values: {
        ann: "Annual",
        djf: "Winter (Dec-Jan-Feb)",
        mam: "Spring (Mar-Apr-May)",
        jja: "Summer (Jun-Jul-Aug)",
        son: "Autumn (Sep-Oct-Nov)",
        t_2m: "mean air temperature 2m",
        tmax_2m: "maximum air temperature 2m",
        tmin_2m: "minimum air temperature 2m",
        "downscaling of era5 @2.2 km over italy":
          "Downscaling of ERA5 @2.2 km over Italy",
      },
    },
  };

  constructor() {}

  translate(key: string, lang = "en"): string {
    if (!key) return;
    if (this.dictionary[lang] != null) {
      key = key.trim().toLowerCase();
      return this.dictionary[lang].values[key];
    }
  }
}

import json #xml.etree.ElementTree as readXml
from typing import Any, Dict, Optional

import requests
import typer
from controller import PROJECT_DIR, log
from controller.app import Application, Configuration
from pathlib import Path
from requests.auth import HTTPBasicAuth

app = typer.Typer()

#@app.command()
    

def get_nifi_api_uri():
    if Configuration.production:
        return "https://localhost:8080/"#nifi-api"
    else:
        return "http://localhost:8080/"#nifi-api"

@Application.app.command(help="upload template in nifi from the versioned folder")
def importLayer(file: Path = typer.Argument(None, help="path of file to upload")):
    Application.print_command(
        # Application.serialize_parameter("--force", force, IF=force),
    )
    Application.get_controller().controller_init()    #Queste servono per inizializzare il comando
    # tirare fuori PWD, User e dominio
    dominio = get_nifi_api_uri()
    username = "admin" #Application.env.get("NIFI_USERNAME")
    ################
    #qua prende o stringa i GEOSERVER_PWD del projectrc
    pw = "geoserver"
    #pw = Application.env.get("GEOSERVER_PASSWORD")
    ##########################################

    # costruisco header


	# costuisco il body
	# costruisco variabile da passare
    data = 	{
   "import": {
      "targetWorkspace": {
         "workspace": {
            "name": "tasmania"
         }
      },
      "data": {
        "type": "directory",
        "location": "C:/data/tasmania"
      }
   }
}

    {
	   "import": {
	         "targetWorkspace": {
	                  "workspace": {
	                              "name": "highlander"
	                               }
	                            },
	                   "data": {
        "type": "directory", # forse gli passo un file?
        "location": file #sarà una variabile che gli passo
        }
     }
     }

    #headers = {
    #"Content-type: application/json"
            #"Host": Configuration.hostname,
    #}
    token_url = f"{dominio}/geoserver/rest/imports?exec=True"    

	# Qua prima chiamata

    r = requests.post(token_url, data=data,  verify=False)
    log.info(r.text)
    log.info(r.status_code)


{
   "import": {
      "targetWorkspace": {
         "workspace": {
            "name": "tasmania"
         }
      },
      "data": {
        "type": "directory",
        "location": "C:/data/tasmania"
      }
   }
}
from importlib.util import module_from_spec,spec_from_file_location
from pathlib import Path
import os,sys,tempfile
HERE=Path(__file__).resolve().parent
PLUGIN=HERE.parents[1]
ROOT=PLUGIN.parent
os.environ['HERMES_HOME']=tempfile.mkdtemp(prefix='penguin-share-fixture-')
sys.path.insert(0,str(ROOT/'reference/hermes-agent'))
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
spec=spec_from_file_location('penguin_share_fixture_api',PLUGIN/'dashboard/plugin_api.py')
api=module_from_spec(spec);spec.loader.exec_module(api)
app=FastAPI()
app.include_router(api.router,prefix='/api/plugins/penguin')
app.mount('/',StaticFiles(directory=HERE,html=True))
if __name__=='__main__':
 import uvicorn
 uvicorn.run(app,host='127.0.0.1',port=8779)

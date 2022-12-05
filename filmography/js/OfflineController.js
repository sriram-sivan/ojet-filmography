'use strict';

define([
        'persist/persistenceManager',
        'persist/persistenceStoreManager',
        'persist/defaultResponseProxy',
        'persist/persistenceUtils',
        'persist/fetchStrategies',
        'persist/impl/logger',
        'persist/oracleRestJsonShredding',
        'persist/simpleJsonShredding',
        'persist/queryHandlers',
        'persist/pouchDBPersistenceStoreFactory',
        'persist/impl/sql-where-parser.min',
        'MyCacheStrategies',
    ],
    function (PersistenceManager, PersistenceStoreManager, DefaultResponseProxy, PersistenceUtils, 
        FetchStrategies, Logger,  OracleRestJsonShredding, SimpleJsonShredding, QueryHandlers, 
        PouchDBPersistenceStoreFactory, SqlWhereParser, MyCacheStrategies) {

        function OfflineController(app) {
            var self = this;

            const OBJ_FILM_MAP = {
                SCOPE: '/WxActorFilmMap_c',
                STORE: 'filmMap',
                ID_FIELD: 'Id'
            };

            const OBJ_ACTORS = {
                SCOPE: '/WxActor_c',
                STORE: 'actors',
                ID_FIELD: 'Id'
            };

            const OBJ_FILMS = {
                SCOPE: '/WxFilm_c',
                STORE: 'films',
                ID_FIELD: 'Id'
            };

            const OBJ_GENRES = {
                SCOPE: 'WX_FILM_GENRE',
                STORE: 'genres',
                ID_FIELD: 'LookupCode'
            };

            Logger.option('level', Logger.LEVEL_LOG);
            Logger.option('writer', console);

            PersistenceStoreManager.registerDefaultStoreFactory(PouchDBPersistenceStoreFactory);

            self.getSyncLog = () => {
                return PersistenceManager.getSyncManager().getSyncLog();
            }

            self.removeGetsFromSyncLog = () => {
                return new Promise(async (resolve, reject) => {
                    let syncLog = await self.getSyncLog();
                    for (let i = 0; i < syncLog.length; i++) {
                        if (syncLog[i].request.method === 'GET') {
                            let requestId = syncLog[i].requestId;
                            let removedRequest = await PersistenceManager.getSyncManager().removeRequest(requestId);
                            console.log("000 STOPPED SYNC FOR GET: " + removedRequest.url);
                        }
                    }
                    resolve();
                });
            }

            self.syncOfflineChanges = async () => {
                if (!PersistenceManager.isOnline()) {
                    alert("YOU ARE OFFLINE!");
                    return;
                }

                // open sync modal dialog to show progress
                document.getElementById("modalDialogSyncProgress").open();

                await self.removeGetsFromSyncLog();

                return new Promise(async (resolve, reject) => {
                    try {
                        await PersistenceManager.getSyncManager().sync({preflightOptionsRequest: 'disabled'});
                        console.log("000 SYNC DONE!");
                        resolve();
                    } catch (err) {
                        console.log("000 SYNC ERROR:");
                        console.log(err);
                        let response = err.response;
                        console.log(`000 SYNC ERROR HTTP ${response.status}: ${err.requestId}`);
                        response.json().then((value) => {
                            console.log("000 SYNC CONFLICTS WITH", value);
                        });
                        reject(err);
                    }
                });
            }


            PersistenceManager.init().then(() => {
                PersistenceManager.register({
                    scope: OBJ_FILMS.SCOPE
                }).then(function (registration) {
                    let responseProxy = DefaultResponseProxy.getResponseProxy({
                        jsonProcessor: {
                            shredder: OracleRestJsonShredding.getShredder(OBJ_FILMS.STORE, OBJ_FILMS.ID_FIELD),
                            unshredder: OracleRestJsonShredding.getUnshredder()
                        },
                        queryHandler: QueryHandlers.getOracleRestQueryHandler(OBJ_FILMS.STORE),
                        requestHandlerOverride: {
                            handlePatch: function (request) {
                                return new Promise(resolve => {
                                    if (PersistenceManager.isOnline()) {
                                        resolve(PersistenceManager.browserFetch(request));
                                    }
                                    else {

                                        PersistenceUtils.requestToJSON(request).then(async (data) => {
                                            console.log("000 handlePatch data", data);

                                            let editedRecordData = JSON.parse(data.body.text);
                                            console.log("000 handlePatch editedRecordData", editedRecordData);

                                            const store = await PersistenceStoreManager.openStore(OBJ_FILMS.STORE);
                                            let storeRecord = await store.findByKey(editedRecordData.Id);
                                            console.log("000 handlePatch storeRecord", storeRecord);

                                            //storeRecord = editedRecordData;
                                            storeRecord.Title_c = editedRecordData.Title_c;
                                            storeRecord.Genre_c = editedRecordData.Genre_c;

                                            store.upsert(editedRecordData.Id, JSON.parse('{}'), storeRecord);
                                        });

                                        let init = {
                                            'status': 503,
                                            'statusText': 'Edit will be processed when online'
                                        };
                                        return resolve(new Response(null, init));
                                    }
                                });
                            },
                            handlePost: function (request) {
                                request = request.clone();
                                return new Promise(resolve => {
                                    if (PersistenceManager.isOnline()) {
                                        resolve(PersistenceManager.browserFetch(request));
                                    }
                                    else {
                                        PersistenceUtils.requestToJSON(request).then((requestData) => {

                                            let newRecordWithTempId = JSON.parse(requestData.body.text);
                                            const tempId =  Math.floor(Math.random() * 10000);
                                            newRecordWithTempId.Id = tempId;
                                            newRecordWithTempId.NewTempId = tempId;
                                
                                            // push back into request
                                            requestData.body.text = JSON.stringify(newRecordWithTempId);
                                
                                            requestData.status = 201;
                                            requestData.statusText = 'Created';
                                
                                            requestData.headers['content-type'] = 'application/json';
                                            requestData.headers['x-oracle-jscpt-cache-expiration-date'] = '';
                                
                                            // if the request contains an ETag then we have to generate a new one
                                            var ifMatch = requestData.headers['if-match'];
                                            var ifNoneMatch = requestData.headers['if-none-match'];
                                
                                            if (ifMatch || ifNoneMatch) {
                                              var randomInt = Math.floor(Math.random() * 1000000);
                                              requestData.headers['etag'] = (Date.now() + randomInt).toString();
                                              requestData.headers['x-oracle-jscpt-etag-generated'] = requestData.headers['etag'];
                                              delete requestData.headers['if-match'];
                                              delete requestData.headers['if-none-match'];
                                            }
                                
                                            console.log("000 handlePost requestData2", requestData);
                                            console.log("000 handlePost requestData2 storing...",  JSON.parse(requestData.body.text));
                                
                                            PersistenceStoreManager.openStore(OBJ_FILMS.STORE).then((store) => {
                                                store.upsert(tempId, JSON.parse('{}'), JSON.parse(requestData.body.text));
                                            });
                                
                                            resolve(PersistenceUtils.responseFromJSON(requestData));
                                          });
                                    }
                                });
                            }
                        },
                        fetchStrategy: FetchStrategies.getCacheFirstStrategy({
                            backgroundFetch: 'disabled',
                            serverResponseCallback: function (request, response) {
                                console.log("000 serverResponseCallback request", request);
                                console.log("000 serverResponseCallback response", response);
                                return new Promise((resolve, reject) => {
                                    resolve(response);
                                });
                            }
                        }),
                        cacheStrategy: MyCacheStrategies.getHttpCacheHeaderStrategy(),
                    });
                    let fetchListener = responseProxy.getFetchEventListener();
                    registration.addEventListener('fetch', fetchListener);
                });

                const _deleteClientCachedObject = (value, store, idAttribute) => {
                    console.log('000 _deleteClientCachedObject', value, store, idAttribute)
                    return new Promise(function (resolve, reject) {
                        let id = value[idAttribute || 'id'];
                        console.log("000 _deleteClientCachedObject id", id);
                        PersistenceStoreManager.openStore(store).then((store) => {
                            store.removeByKey(id);
                            resolve();
                        });
                    });
                };

                const beforeSyncRequestListener = (event) => {
                    console.log("000 beforeSyncRequestListener event", event);

                    return new Promise(resolve => {
                        PersistenceUtils.requestToJSON(event.request).then(async requestData => {
                            console.log('000 beforeSyncRequestListener requestData', requestData);
                            // only do this for the FilmMaps
                            if ((requestData.url).includes(OBJ_FILM_MAP.SCOPE)) {
                                console.log("000 beforeSyncRequestListener FilmMaps OK - processing...");

                                let origReqObj = JSON.parse(requestData.body.text);
                                console.log("000 beforeSyncRequestListener origReqObj", origReqObj);
                                
                                const tempId = origReqObj.Film_Id_c;
                                console.log('000 beforeSyncRequestListener tempId', tempId);
    
                                let newResultId = 0;
                                const store = await PersistenceStoreManager.openStore(OBJ_FILMS.STORE);
                                const keys = await store.keys();
                                for (let k in keys) {
                                    const key = keys[k];
                                    const storeResult = await store.findByKey(key);
                                    if (origReqObj.Film_c === storeResult.Title_c && !storeResult.NewTempId) {
                                        newResultId = storeResult.Id;
                                    }
                                }
                                console.log("newResultId", newResultId);
    
                                if (newResultId > 0) {
                                    // clean up the payload for Fusion
                                    delete origReqObj.Actor_c;
                                    delete origReqObj.Film_c;
                                    
                                    // fix the ID...
                                    origReqObj.Film_Id_c = newResultId;
        
                                    requestData.body.text = JSON.stringify(origReqObj);
                                    
                                    PersistenceUtils.requestFromJSON(requestData).then(updatedRequest => {
                                        console.log("what goes to Fusion???", updatedRequest);
                                        resolve({action: 'replay', request: updatedRequest});
                                    })
                                }
                                else {
                                    resolve({action: 'replay', request: event.request.clone()});
                                }
                            }
                            else {
                                resolve({action: 'replay', request: event.request.clone()});
                            }
                        })
                    });
                }

                const afterSyncRequestListener = (event) => {
                    console.log('000 afterSyncRequestListener syncd', event);
                    return new Promise(resolve => {
                        Promise.all([PersistenceUtils.requestToJSON(event.request), PersistenceUtils.responseToJSON(event.response)]).then(values => {
                            const requestData = values[0];
                            const responseData = values[1];
                            console.log('000 afterSyncRequestListener requestData', requestData);
                            console.log('000 afterSyncRequestListener responseData', responseData);
                            if (requestData.method === 'POST') {
                                const body = JSON.parse(responseData.body.text || '{}');
                                console.log('000 afterSyncRequestListener body', body);

                                // delete record with temp id from cache
                                _deleteClientCachedObject(JSON.parse(requestData.body.text), OBJ_FILMS.STORE, OBJ_FILMS.ID_FIELD).then(() => {
                                    resolve({
                                        action: 'continue'
                                    });
                                });
                            }

                            resolve({
                                action: 'continue'
                            });
                        });
                    });
                };

                PersistenceManager.getSyncManager().addEventListener('beforeSyncRequest', beforeSyncRequestListener, OBJ_FILMS.SCOPE);

                PersistenceManager.getSyncManager().addEventListener('syncRequest', afterSyncRequestListener, OBJ_FILMS.SCOPE);

                PersistenceManager.getSyncManager().addEventListener('beforeSyncRequest', beforeSyncRequestListener, OBJ_FILM_MAP.SCOPE);


                PersistenceManager.register({
                    scope: OBJ_ACTORS.SCOPE
                }).then(function (registration) {
                    let responseProxy = DefaultResponseProxy.getResponseProxy({
                        jsonProcessor: {
                            shredder: OracleRestJsonShredding.getShredder(OBJ_ACTORS.STORE, OBJ_ACTORS.ID_FIELD),
                            unshredder: OracleRestJsonShredding.getUnshredder()
                        },
                        queryHandler: QueryHandlers.getOracleRestQueryHandler(OBJ_ACTORS.STORE),
                        cacheStrategy: MyCacheStrategies.getHttpCacheHeaderStrategy(),
                    });
                    let fetchListener = responseProxy.getFetchEventListener();
                    registration.addEventListener('fetch', fetchListener);
                });
                

                PersistenceManager.register({
                    scope: OBJ_FILM_MAP.SCOPE
                }).then(function (registration) {
                    let responseProxy = DefaultResponseProxy.getResponseProxy({
                        jsonProcessor: {
                            shredder: OracleRestJsonShredding.getShredder(OBJ_FILM_MAP.STORE, OBJ_FILM_MAP.ID_FIELD),
                            unshredder: OracleRestJsonShredding.getUnshredder()
                        },
                        queryHandler: QueryHandlers.getOracleRestQueryHandler(OBJ_FILM_MAP.STORE),
                        requestHandlerOverride: {handlePost: myHandlePost},
                        cacheStrategy: MyCacheStrategies.getHttpCacheHeaderStrategy(),
                    });
                    let fetchListener = responseProxy.getFetchEventListener();
                    registration.addEventListener('fetch', fetchListener);
                });


                PersistenceManager.register({
                    scope: OBJ_GENRES.SCOPE
                }).then(function (registration) {
                    let responseProxy = DefaultResponseProxy.getResponseProxy({
                        jsonProcessor: {
                            shredder: OracleRestJsonShredding.getShredder(OBJ_GENRES.STORE, OBJ_GENRES.ID_FIELD),
                            unshredder: OracleRestJsonShredding.getUnshredder()
                        },
                        cacheStrategy: MyCacheStrategies.getHttpCacheHeaderStrategy(),
                    });
                    let fetchListener = responseProxy.getFetchEventListener();
                    registration.addEventListener('fetch', fetchListener);
                });

            });

            const myHandlePost = (request) => {
                request = request.clone();
                return new Promise(resolve => {
                    if (PersistenceManager.isOnline()) {
                        resolve(PersistenceManager.browserFetch(request));
                    }
                    else {
                        PersistenceUtils.requestToJSON(request).then((requestData) => {

                            let newRecordWithTempId = JSON.parse(requestData.body.text);
                            newRecordWithTempId.Id = Math.floor(Math.random() * 10000);
                            console.log("newRecordWithTempId", newRecordWithTempId);
                
                            // push back into request
                            requestData.body.text = JSON.stringify(newRecordWithTempId);
                
                            requestData.status = 201;
                            requestData.statusText = 'Created';
                
                            requestData.headers['content-type'] = 'application/json';
                            requestData.headers['x-oracle-jscpt-cache-expiration-date'] = '';
                
                            // if the request contains an ETag then we have to generate a new one
                            var ifMatch = requestData.headers['if-match'];
                            var ifNoneMatch = requestData.headers['if-none-match'];
                
                            if (ifMatch || ifNoneMatch) {
                              var randomInt = Math.floor(Math.random() * 1000000);
                              requestData.headers['etag'] = (Date.now() + randomInt).toString();
                              requestData.headers['x-oracle-jscpt-etag-generated'] = requestData.headers['etag'];
                              delete requestData.headers['if-match'];
                              delete requestData.headers['if-none-match'];
                            }
                
                            console.log("000 handlePost requestData2", requestData);
                
                            PersistenceStoreManager.openStore(OBJ_FILM_MAP.STORE).then((store) => {
                                store.upsert(newRecordWithTempId.Id, JSON.parse('{}'), JSON.parse(requestData.body.text));
                            });
                
                            resolve(PersistenceUtils.responseFromJSON(requestData));
                          });
                    }
                });
            }
        }

        return OfflineController;
    }
)
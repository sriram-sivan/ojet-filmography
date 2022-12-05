require(['knockout',
    'ojs/ojbootstrap',
    'ojs/ojarraydataprovider',
    'ojs/ojdeferreddataprovider',
    'OfflineController',
    'fuseService',
    'ojs/ojknockout',
    'ojs/ojtable',
    'ojs/ojbutton', 'ojs/ojradioset', 'ojs/ojlabel',
    'ojs/ojaccordion', 'ojs/ojdialog', 'ojs/ojformlayout',
    'ojs/ojinputtext', 'ojs/ojinputnumber', 'ojs/ojselectsingle', 
    'ojs/ojprogress-bar', 'ojs/ojcheckboxset'

], function (ko, Bootstrap, ArrayDataProvider, DeferredDataProvider, OfflineController, fuse) {
    'use strict';

    let ViewModel = function () {

        // init OPT Offline Persistence Toolkit
        this.offlineController = new OfflineController(this);

        // dataProviders
        this.dataProviderActors = ko.observable();
        this.dataProviderFilms = ko.observable();
        this.dataProviderGenres = ko.observable();
        this.dataProviderActorFilmMap = ko.observable();

        this.dialogCancelBehaviorOpt = ko.observable("icon");
        this.filmCount = ko.observable();
        this.syncLogInfo = ko.observable();
        this.titleSearchValue = ko.observable("Top Gun");
        this.titleSearchRawValue = ko.observable("Top Gun");
        this.limitSearchValue = ko.observable(100);
        this.offsetSearchValue = ko.observable(0);
        this.filmGenreVal = ko.observable("");
        this.filmTitleVal = ko.observable("");
        this.actorNameVal = ko.observable("");
        this.filmActorVal = ko.observable("");
        this.filmIdToEdit = ko.observable();
        this.filmActorUseQuery = ko.observableArray();
        this.filmActorQueryString = ko.observable("");

        this.filmsActionMenuListener = (event, context) => {
            console.log("filmsActionMenuListener event", event.detail.selectedValue);
            console.log("filmsActionMenuListener context", context.item.data);
            this.filmIdToEdit(context.item.data.id);
            if (event.detail.selectedValue === "edit") {
                this.filmTitleVal(context.item.data.title);
                this.filmGenreVal(context.item.data.genre);
                document.getElementById("modalDialogEditFilm").open();
            }

            if (event.detail.selectedValue === "delete") {
                // TODO
            }
        }

        this.removeGetsFromSyncLog = async (event) => {
            await this.offlineController.removeGetsFromSyncLog();
            this.syncLogInfo("all GETs removed OK from syncLog - refresh it now!");
        }

        this.doSyncChanges = async (event) => {
            await this.offlineController.syncOfflineChanges();
            document.getElementById("modalDialogSyncProgress").close();
        }

        this.createNewFilm = (event) => {
            fuse.createFilm(this.filmTitleVal(), this.filmGenreVal()).then(async (data) => {
                console.log("createFilm", data);
                if (data.Id > 0) {
                    document.getElementById("modalDialogNewFilm").close();
                }
            });
        }

        this.editFilm = (event) => {
            fuse.editFilm(this.filmIdToEdit(), this.filmTitleVal(), this.filmGenreVal()).then(async (data) => {
                console.log("editFilm", data);
                if (data.Id > 0) {
                    document.getElementById("modalDialogEditFilm").close();
                }
            });
        }
        
        this.closeEditFilmModal = (event) => {
            document.getElementById("modalDialogEditFilm").close();
        }

        this.createNewActorFilmMap = (event) => {
            // get the labels using the IDs
            const labelFilmTitle = this.dataProviderFilms().dataProvider.data.find(element => element.id === this.filmTitleVal());
            //console.log("labelFilmTitle", labelFilmTitle);
            const labelActorName = this.dataProviderActors().dataProvider.data.find(element => element.id === this.filmActorVal());
            //console.log("labelActorName", labelActorName);
            fuse.createActorFilmMap(this.filmActorVal(), this.filmTitleVal(), labelFilmTitle.label, labelActorName.label).then(async (data) => {
                console.log("createNewActorFilmMap", data);
                if (data.Id > 0) {
                    document.getElementById("modalDialogNewActorFilmMap").close();
                }
            });
        }

        this.openModalDialogNewActorFilmMap = (event) => {
            document.getElementById("modalDialogNewActorFilmMap").open();
        }
        this.closeModalDialogNewActorFilmMap = (event) => {
            document.getElementById("modalDialogNewActorFilmMap").close();
        }

        this.closeNewFilmModal = (event) => {
            document.getElementById("modalDialogNewFilm").close();
        }

        this.createFilm = (event) => {
            document.getElementById("modalDialogNewFilm").open();
        }

        this.getActorFilmMap = (event) => {
            const queryWhere = this.filmActorUseQuery._latestValue[0]==='usequery' ? this.filmActorQueryString._latestValue : null;
            fuse.getActorFilmMap(queryWhere).then(async (data) => {
                console.log("actorFilmMap", data);
                this.dataProviderActorFilmMap(new DeferredDataProvider(new Promise((resolve) => {
                    const tempArray = data.items.map(item => {
                        return {
                            id: item.Id,
                            actor: item.Actor_Id_c + ` (${item.Actor_Id_Id_c})`,
                            film: item.Film_id_c + ` (${item.Film_id_Id_c})`,
                            actorId: item.Actor_Id_Id_c,
                            filmId: item.Film_id_Id_c
                        };
                    })
                    resolve(new ArrayDataProvider(tempArray, {
                        keyAttributes: 'id'
                    }))
                })));
            });
        };

        this.setDataProviderFilms = (data) => {
            console.log("films", data);
            this.filmCount(`cnt: ${data.count}`);
            this.dataProviderFilms(new DeferredDataProvider(new Promise((resolve) => {
                const tempArray = data.items.map(item => {
                    return {
                        id: item.Id,
                        title: item.Title_c,
                        genre: item.Genre_c,
                        value: item.Id,
                        label: item.Title_c
                    };
                })
                resolve(new ArrayDataProvider(tempArray, {
                    keyAttributes: 'id'
                }))
            })));
        }

        this.getFilms = (event) => {
            fuse.getFilms(null, null, 0).then(async (data) => {
                this.setDataProviderFilms(data);
            });
        };

        this.searchFilmsByTitleAndLimit = (event) => {
            fuse.getFilms(this.titleSearchValue(), this.limitSearchValue(), this.offsetSearchValue()).then(async (data) => {
                this.setDataProviderFilms(data);
            });
        }

        this.searchFilmsByLimit = (event) => {
            fuse.getFilms(null, this.limitSearchValue(), this.offsetSearchValue()).then(async (data) => {
                this.setDataProviderFilms(data);
            });
        }

        this.searchFilmsByTitle = (event) => {
            fuse.getFilms(this.titleSearchValue(), null, this.offsetSearchValue()).then(async (data) => {
                this.setDataProviderFilms(data);
            });
        }

        this.getActors = (event) => {
            fuse.getActors().then(async (data) => {
                console.log("actors", data);
                this.dataProviderActors(new DeferredDataProvider(new Promise((resolve) => {
                    const tempArray = data.items.map(item => {
                        return {
                            id: item.Id,
                            name: item.Name_c,
                            value: item.Id,
                            label: item.Name_c
                        };
                    })
                    resolve(new ArrayDataProvider(tempArray, {
                        keyAttributes: 'id'
                    }))
                })));
            });
        };

        this.getGenres = (event) => {
            fuse.getGenres().then(async (data) => {
                console.log("genres", data);
                this.dataProviderGenres(new DeferredDataProvider(new Promise((resolve) => {
                    const tempArray = data.items.map(item => {
                        return {
                            id: item.DisplaySequence,
                            code: item.LookupCode,
                            value: item.LookupCode,
                            label: item.LookupCode
                        };
                    })
                    resolve(new ArrayDataProvider(tempArray, {
                        keyAttributes: 'code'
                    }))
                })));
            });
        };

        this.getSyncLog = (event) => {
            const syncLogElem = document.getElementById("syncLog");
            syncLogElem.innerHTML = ""; //empty
            this.offlineController.getSyncLog().then(async (data) => {
                console.log("getSyncLog", data);
                this.syncLogInfo(`how many in syncLog? ${data.length}`)
                for (let i = 0; i < data.length; i++) {
                    let request = data[i];
                    let requestId = request.requestId;
                    let pTag = document.createElement("p");
                    var reqText = document.createTextNode(`${i+1}: ${request.request.method} @ ${request.request.url} --- request id ${requestId}`);
                    pTag.appendChild(reqText);
                    syncLogElem.appendChild(pTag);
                }
            });
        };
        this.createNewActor = (event) => {
            fuse.createActor(this.actorNameVal()).then(async (data) => {
                console.log("createActor", data);
                if (data.Id > 0) {
                    document.getElementById("modalDialogNewActor").close();
                }
            });
        }

        this.closeNewActorModal = (event) => {
            document.getElementById("modalDialogNewActor").close();
        }

        this.createActor = (event) => {
            document.getElementById("modalDialogNewActor").open();
        }
    };

    const updateNetworkStatus = (newColor, newText) => {
        document.getElementById("networkStatus").style.backgroundColor = newColor;
        document.getElementById("networkStatus").innerText = newText;
    }
    const setNetworkStatusOnline = () => {
        // Ivy
        updateNetworkStatus("#759C6C", "ONLINE");
    }
    const setNetworkStatusOffline = () => {
        // Oracle Red
        updateNetworkStatus("#C74634", "Network connection lost. You are OFFLINE!");
    }

    Bootstrap.whenDocumentReady().then(() => {
        console.log(`JET ${oj.version} Ready`);
        ko.applyBindings(new ViewModel(), document.getElementById("mainWrapper"));
        setTimeout(() => {
            if (navigator.onLine) {
                setNetworkStatusOnline();
            } else {
                setNetworkStatusOffline();
            }
            window.addEventListener("online", () => {
                //alert("You are back ONLINE!");
                setNetworkStatusOnline();
            });
            window.addEventListener("offline", () => {
                //alert("Network connection lost. You are now OFFLINE!");
                setNetworkStatusOffline();
            });
            console.log("000 online offline regs OK");
        }, 3500);
    }); //whenDocumentReady
});
import { v4 as uuidv4 } from "uuid";
import { Diagram, DiagramItem } from "./model";
import { ElmApp } from "./elm";

export const initDB = (app: ElmApp) => {
    const lazyDB = () => {
        // @ts-ignore
        let db = null;

        return async () => {
            // @ts-ignore
            if (!db) {
                const Dexie = await import("dexie");
                // @ts-ignore
                db = new Dexie.default("textusm");
                // @ts-ignore
                db.version(1).stores({
                    diagrams:
                        "++id,title,text,thumbnail,diagramPath,createdAt,updatedAt",
                });

                db.version(2)
                    .stores({
                        diagrams:
                            "++id,title,text,thumbnail,diagram,isBookmark,createdAt,updatedAt",
                    })
                    //@ts-ignore
                    .upgrade((trans) => {
                        //@ts-ignore
                        return (
                            //@ts-ignore
                            trans.diagrams
                                .toCollection()
                                //@ts-ignore
                                .modify((diagram) => {
                                    diagram.diagram = diagram.diagramPath;
                                    diagram.isBookmark = false;
                                    delete diagram.diagramPath;
                                })
                        );
                    });
            }
            //@ts-ignore
            return db;
        };
    };
    const db = lazyDB();
    const svg2base64 = (id: string) => {
        const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        );
        svg.setAttribute("viewBox", `0 0 1280 960`);
        svg.setAttribute("width", "320");
        svg.setAttribute("height", "240");
        svg.setAttribute("style", "background-color: #F5F5F6;");
        const elm = document.querySelector(`#${id}`);

        if (elm) {
            svg.innerHTML = elm.innerHTML;
        }

        return `data:image/svg+xml;base64,${window.btoa(
            unescape(
                encodeURIComponent(new XMLSerializer().serializeToString(svg))
            )
        )}`;
    };

    app.ports.saveDiagram.subscribe(
        async ({
            id,
            title,
            text,
            diagram,
            isPublic,
            isBookmark,
            isRemote,
            tags,
        }: Diagram) => {
            const thumbnail = svg2base64("usm");
            const createdAt = new Date().getTime();
            const diagramItem: DiagramItem = {
                title,
                text,
                thumbnail,
                diagram,
                isPublic,
                isBookmark,
                tags,
                createdAt,
                updatedAt: createdAt,
            };

            if (isRemote) {
                app.ports.saveToRemote.send(
                    JSON.stringify({
                        ...diagramItem,
                        isRemote: true,
                        isBookmark: isBookmark,
                        id,
                        isPublic,
                    })
                );
                if (id) {
                    // @ts-ignore
                    await (await db()).diagrams.delete(id);
                }
            } else {
                const newId = id ? id : uuidv4();
                // @ts-ignore
                await (await db()).diagrams.put({ id: newId, ...diagramItem });
                app.ports.saveToLocalCompleted.send(
                    JSON.stringify({
                        ...diagramItem,
                        isRemote: false,
                        isBookmark: isBookmark,
                        id: newId,
                        isPublic,
                    })
                );
            }
        }
    );

    app.ports.removeDiagrams.subscribe(async (diagram: Diagram) => {
        const { id, title, isRemote } = diagram;
        if (
            window.confirm(
                `Are you sure you want to delete "${title}" diagram?`
            )
        ) {
            if (isRemote) {
                app.ports.removeRemoteDiagram.send(JSON.stringify(diagram));
            } else {
                // @ts-ignore
                await (await db()).diagrams.delete(id);
                app.ports.removedDiagram.send([JSON.stringify(diagram), true]);
            }
        }
    });

    app.ports.getDiagram.subscribe(async (diagramId: string) => {
        // @ts-ignore
        const diagram = await (await db()).diagrams.get(diagramId);
        app.ports.gotLocalDiagramJson.send(
            JSON.stringify({
                ...diagram,
                isPublic: false,
                isBookmark: false,
                isRemote: false,
            })
        );
    });

    app.ports.getDiagrams.subscribe(async () => {
        // @ts-ignore
        const diagrams = await (await db()).diagrams
            .orderBy("updatedAt")
            .reverse()
            .toArray();
        app.ports.gotLocalDiagramsJson.send(
            JSON.stringify(
                diagrams.map((d: Diagram) => ({
                    ...d,
                    isPublic: false,
                    isBookmark: false,
                    isRemote: false,
                }))
            )
        );
    });
};

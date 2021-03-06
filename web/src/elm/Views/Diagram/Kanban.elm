module Views.Diagram.Kanban exposing (view)

import Constants
import Data.Item exposing (Item)
import Data.Position as Position exposing (Position)
import Models.Diagram as Diagram exposing (Model, Msg(..), Settings, fontStyle)
import Models.Views.Kanban as Kanban exposing (Card(..), Kanban(..), KanbanList(..))
import String
import Svg exposing (Svg, g, line, text, text_)
import Svg.Attributes exposing (fill, fontFamily, fontSize, fontWeight, stroke, strokeWidth, style, transform, x, x1, x2, y, y1, y2)
import Svg.Lazy exposing (lazy3)
import Views.Diagram.Views as Views
import Views.Empty as Empty


kanbanMargin : Int
kanbanMargin =
    24


view : Model -> Svg Msg
view model =
    case model.data of
        Diagram.Kanban k ->
            g
                [ transform
                    ("translate("
                        ++ String.fromInt (Position.getX model.position)
                        ++ ","
                        ++ String.fromInt (Position.getY model.position)
                        ++ "), scale("
                        ++ String.fromFloat model.svg.scale
                        ++ ","
                        ++ String.fromFloat model.svg.scale
                        ++ ")"
                    )
                , fill model.settings.backgroundColor
                , if model.moveStart then
                    style "will-change: transform;"

                  else
                    style "will-change: transform;transition: transform 0.15s ease"
                ]
                [ lazy3 kanbanView model.settings model.selectedItem k ]

        _ ->
            Empty.view


kanbanView : Settings -> Maybe Item -> Kanban -> Svg Msg
kanbanView settings selectedItem kanban =
    let
        (Kanban lists) =
            kanban

        listWidth =
            settings.size.width + Constants.itemMargin * 3

        height =
            Kanban.getCardCount kanban * (settings.size.height + Constants.itemMargin) + Constants.itemMargin
    in
    g []
        (List.indexedMap
            (\i list ->
                listView settings height ( i * listWidth + Constants.itemMargin, 0 ) selectedItem list
            )
            lists
        )


listView : Settings -> Int -> Position -> Maybe Item -> KanbanList -> Svg Msg
listView settings height ( posX, posY ) selectedItem (KanbanList name cards) =
    g []
        (text_
            [ x <| String.fromInt <| posX + 8
            , y <| String.fromInt <| posY + kanbanMargin
            , fontFamily (fontStyle settings)
            , fill settings.color.label
            , fontSize "16"
            , fontWeight "bold"
            ]
            [ text name ]
            :: line
                [ x1 <| String.fromInt <| posX + settings.size.width + 8 + Constants.itemMargin
                , y1 "0"
                , x2 <| String.fromInt <| posX + settings.size.width + 8 + Constants.itemMargin
                , y2 <| String.fromInt <| height + Constants.itemMargin
                , stroke settings.color.line
                , strokeWidth "3"
                ]
                []
            :: List.indexedMap
                (\i (Card item) ->
                    Views.cardView settings
                        ( posX
                        , posY + kanbanMargin + Constants.itemMargin + (settings.size.height + Constants.itemMargin) * i
                        )
                        selectedItem
                        item
                )
                cards
        )

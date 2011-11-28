%% -*- mode: erlang -*-
%% -*- erlang-indent-level: 4;indent-tabs-mode: nil -*-
%% ex: ts=4 sw=4 et
%% Copyright 2011 Benjamin Nortier
%%
%%   Licensed under the Apache License, Version 2.0 (the "License");
%%   you may not use this file except in compliance with the License.
%%   You may obtain a copy of the License at
%%
%%       http://www.apache.org/licenses/LICENSE-2.0
%%
%%   Unless required by applicable law or agreed to in writing, software
%%   distributed under the License is distributed on an "AS IS" BASIS,
%%   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
%%   See the License for the specific language governing permissions and
%%   limitations under the License.

-module(node_geom_store).
-author('Benjamin Nortier <bjnortier@gmail.com>').

-export([create/3, exists/3, get/3]).

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%                                 public                                   %%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% 

create(User, Design, Body) ->
    case decode_json(Body) of
	{ok, JSON} ->
	    case node_master:create_geom(User, Design, JSON) of
		{ok, Sha} ->
		    Path = io_lib:format("/~s/~s/geom/~s", [User, Design, Sha]),
		    Response = jiffy:encode({[{<<"path">>, iolist_to_binary(Path)}]}),
		    {ok, Response};
		{error, Reason = {validation, _}} ->
		    {error, error_response(Reason)};
		{error, Reason} ->
		    {error, 500,error_response(Reason)}
	    end;
	invalid ->
	    {error, <<"\"invalid json\"">>}
end.

exists(User, Design, SHA) ->
    node_geom_db:exists(User, Design, SHA).

get(User, Design, SHA) ->
    node_geom_db:get(User, Design, SHA).

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%                                 private                                  %%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% 

decode_json(Body) ->
    try 
	{ok, jiffy:decode(Body)}
    catch
	_:_ ->
            lager:warning("invalid JSON: ~p", [Body]),
	    invalid
    end.
   
error_response({validation, ErrorParams}) ->
    jiffy:encode({[{<<"validation">>, ErrorParams}]});
error_response({error,worker_timeout}) ->
    jiffy:encode({[{<<"error">>, <<"timeout">>}]});
error_response(_) ->
    jiffy:encode({[{<<"error">>, <<"internal error">>}]}).

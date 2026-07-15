import React from "react";
import SearchToolbar from "../ui/SearchToolbar";

export default function CustomerToolbar(props) {
  return (
    <SearchToolbar
      value={props.query}
      onChange={props.onQueryChange}
      onSearch={props.onSearch}
      onRefresh={props.onRefresh}
      loading={props.loading}
      placeholder="Cerca nome, contratto, PPPoE, comune..."
      status={props.status}
      onStatusChange={props.onStatusChange}
      profile={props.profile}
      onProfileChange={props.onProfileChange}
      profiles={props.profiles}
      onExport={props.onExport}
    />
  );
}

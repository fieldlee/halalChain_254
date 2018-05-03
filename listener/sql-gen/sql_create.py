#! /usr/bin/python
# -*- coding: UTF-8 -*-
import time, sys, os, json, sys

########################################################
CREATE_DATABASE="DROP DATABASE IF EXISTS `%s`;\nCREATE DATABASE `%s` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;\n"
ADD_PRIVILEGES="GRANT ALL PRIVILEGES ON %s.* TO '%s'@'localhost';\nFLUSH PRIVILEGES;\n"
USE_DB="USE `%s`;\n"
CREATE_TABLE_BEGIN="CREATE TABLE IF NOT EXISTS `%s` (\n"
CREATE_TABLE_END="PRIMARY KEY (%s)\n) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
FIELD="`%s` %s%s %s %s %s %s COMMENT '%s',\n"
########################################################

__legal_type = set(["int8", "uint8", "int16", "uint16", "int32", "uint32", "int64", "uint64", "float", "double", "string", "bytearray", "timestamp"])

def generate_field(field, keys):

    if sys.version > '3':
        if field["name"] == None or field == None or "type" in field == False:
            print("fields attribute error!")
            assert(False)
            return
    else:
        if field["name"] == None or field == None or field.has_key("type") == False:
            print("fields attribute error!")
            assert(False)
            return

    #check type
    global __legal_type
    if not (field["type"] in __legal_type):
        assert(False)
        return

    #is key
    if sys.version > '3':
        if "key" in field and field["key"] == "1":
            keys.append("`%s`" % (field["name"]))
    else:
        if field.has_key("key") and field["key"] == "1":
            keys.append("`%s`" % (field["name"]))

    #length
    length = ""
    if field["type"] == "string" or field["type"] == "bytearray":
        if sys.version > '3':
            if "length" in field == False:
                print("type:%s has no length!" % field["type"])
                assert(False)
                return
        else:
            if field.has_key("length") == False:
                print("type:%s has no length!" % field["type"])
                assert(False)
                return
        length = "(%s)" % (field["length"])

    #allow null
    allow_null = ""
    if sys.version > '3':
        if not("allow_null" in field and field["allow_null"] == "1"):
            allow_null = "NOT NULL"
    else:
        if not(field.has_key("allow_null") and field["allow_null"] == "1"):
            allow_null = "NOT NULL"

    #type and unsigned
    type_name = ""
    unsigned = ""
    if field["type"] == "int8":
        type_name = "TINYINT"
    elif field["type"] == "uint8":
        type_name = "TINYINT"
        unsigned = "UNSIGNED"
    elif field["type"] == "int16":
        type_name = "SMALLINT"
    elif field["type"] == "uint16":
        type_name = "SMALLINT"
        unsigned = "UNSIGNED"
    elif field["type"] == "int32":
        type_name = "INT"
    elif field["type"] == "uint32":
        type_name = "INT"
        unsigned = "UNSIGNED"
    elif field["type"] == "int64":
        type_name = "BIGINT"
    elif field["type"] == "uint64":
        type_name = "BIGINT"
        unsigned = "UNSIGNED"
    elif field["type"] == "float":
        type_name = "FLOAT"
    elif field["type"] == "double":
        type_name = "DOUBLE"
    elif field["type"] == "string":
        type_name = "VARCHAR"
    elif field["type"] == "bytearray":
        type_name = "BLOB"
    elif field["type"] == "timestamp":
        type_name = "TIMESTAMP"
    else:
        assert(False)

    #auto increment
    auto_increment = ""
    if sys.version > '3':
        if "auto_increment" in field and field["auto_increment"] == "1":
            auto_increment = "AUTO_INCREMENT"
    else:
        if field.has_key("auto_increment") and field["auto_increment"] == "1":
            auto_increment = "AUTO_INCREMENT"

    #default
    default = ""
    if sys.version > '3':
        if "default" in field:
            default = "DEFAULT " + "'" + field["default"] + ","
    else:
        if field.has_key("default"):
            default = "DEFAULT " + "'" + field["default"] + ","

    #comment
    comment = ""
    if sys.version > '3':
        if "comment" in field:
            comment = field["comment"]
    else:
        if field.has_key("comment"):
            comment = field["comment"]


    sql = ""
    sql += FIELD % (field["name"], type_name, length, unsigned, allow_null, auto_increment, default, comment)
    return sql

def generate_table(name, detail):

    fields = detail["fields"]
    assert(len(fields) > 0)

    sql = ""

    tbl_list = [name]
    if sys.version > '3':
        if "sharding" in detail and int(detail["sharding"]) > 1:
            tbl_list = ["%s_%d" % (name, i) for i in xrange(0, int(detail["sharding"]))]
    else:
        if detail.has_key("sharding") and int(detail["sharding"]) > 1:
            tbl_list = ["%s_%d" % (name, i) for i in xrange(0, int(detail["sharding"]))]

    for tbl in tbl_list:
        sql += CREATE_TABLE_BEGIN % (tbl)
        keys = []
        for field in fields:
            sql += generate_field(field, keys)

        assert(len(keys) >= 1)
        key_str = ""
        for key in keys:
            key_str += key + ","
        key_str = key_str[:-1]
        sql += CREATE_TABLE_END % (key_str)
        sql += "\n\n"
    return sql

def __generate_sql(db):
    assert(db != None)

    tables = db["table"]
    assert(tables != None and len(tables) > 0)

    sql = ""

    #create DATABASE
    sql += CREATE_DATABASE % (db["name"], db["name"])
    #add privileges
    sql += ADD_PRIVILEGES % (db["name"], db["definer"])
    sql += USE_DB % (db["name"])
    sql += "\n"

    #create table
    for name, detail in tables.items():
        sql += generate_table(name, detail)

    #add version info
    sql += "\nINSERT INTO db_version(version, update_time) VALUES(" + db["version"] + ", utc_timestamp());\n"

    #save to file
    print(sql)

    sql_file = open("%s.sql" % (db["name"]), 'wb')
    sql_file.write(sql.encode("UTF-8"))
    sql_file.flush()
    sql_file.close()

def process(json_file):
    if json_file == None:
        print("process bad arguments!")
        return

    with open(json_file, 'r') as f:
        db_obj = json.load(f)
        file_ver = int(os.path.splitext(json_file)[0].split("db_v")[1])
        json_ver = int(db_obj["version"])
        assert(file_ver == json_ver)
        __generate_sql(db_obj)


if __name__ == "__main__":
    argc = len(sys.argv )
    if argc == 2:
        process("./database/%s" % (sys.argv[1]))
    elif argc == 3:
        process("%s/%s" % (sys.argv[1], sys.argv[2]))
    else:
        process("./database/db_v1.json")
    # raw_input()


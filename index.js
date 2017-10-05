class Replay {
    // 1 is orange 0 is blue
    // numframes / 30 is how long replay is in seconds (not game length)
    // frame number in goals/highlights is frames into the replay it happened
    // ball name none probably means it's a goal, otherwise it's a save i would assume
    // max char for title, 36
    constructor(file) {
        this.pos = 0;
        this.data = {};
        this.replay = file;

        this.prop_len = this.readInt()

        this.crc = this.readUnknown()
        this.data['version_number'] = this.readInt() + '.' + this.readInt() + '.' + this.readInt()
        if (this.readString() != "TAGame.Replay_Soccar_TA") {
            this.pos = 16
        } else {
            this.pos = 20
        }
        this.data['version'] = this.readString()
        this.data['header'] = this.readProps()
        this.players = this.getPlayers()
        if (!this.data['header']['ReplayName']) {
            this.data['header']['ReplayName'] = "undefined";
        }
    }

    getPlayers() {
        var i;
        var player_count = this.data['header']['PlayerStats'].length;
        var players = []
        for (i=0; i<player_count; i++) {
            players.push([this.data['header']['PlayerStats'][i]['Name'],
                this.data['header']['PlayerStats'][i]['Team']])
        }
        return players
    }

    strToBuff(string) {
        var idx;
        var len = string.length;
        var arr = new Array(len);

        for (idx=0; idx<len; idx++) {
            arr[idx] = string.charCodeAt(idx) & 0xFF;
        }

        return new Uint8Array(arr).buffer;
    }

    getBytes(length) {
        if (length === undefined) {
            length = 4;
        }

        var string = this.replay.slice(this.pos, this.pos + length)
        this.pos += length

        return string
    }

    readInt(length) {
        var string = this.getBytes(length)
        var buff_arr = this.strToBuff(string)

        switch (string.length) {
            case 1:
                return new DataView(buff_arr).getInt8(0, true)
            case 2:
                return new DataView(buff_arr).getInt16(0, true)
            case 4:
            case 8:
                return new DataView(buff_arr).getInt32(0, true)
        }
    }

    readFloat(length) {
        var string = this.getBytes(length)
        var buff_arr = this.strToBuff(string)

        switch (string.length) {
            case 4:
                return new DataView(buff_arr).getFloat32(0, true)
            case 8:
                return new DataView(buff_arr).getFloat64(0, true)
        }
    }

    readUnknown(length) {
        return this.getBytes(length)
    }

    readString(length) {
        if (length === undefined) {
            var str_len = this.readInt()
        } else {
            var str_len = length
        }

        var string = this.getBytes(str_len)

        return string.substr(0, string.length - 1)
    }

    readProps() {
        var properties = {}

        while(1) {
            var property = this.readProp()

            if (property) {
                properties[property.name] = property.value
            } else {
                return properties
            }
        }
    }

    readProp() {
        var prop_name = this.readString()

        if (prop_name === 'None') {
            return
        }

        var type_name = this.readString()
        var value, val_len, unkown;

        switch(type_name) {
            case 'IntProperty':
                val_len = this.readInt(8)
                value = this.readInt(val_len)
                break
            case 'StrProperty':
                unkown = this.readInt(8)
                val_len = this.readInt()

                if (val_len < 0) {
                    val_len = Math.abs(val_len) * 2
                }

                value = this.readString(val_len)
                break
            case 'ByteProperty':
                unkown = this.readInt(8)
                value = {}
                value[this.readString()] = this.readString()
                break
            case 'QWordProperty':
                val_len = this.readInt(8)
                value = this.readInt(val_len)
                break
            case 'BoolProperty':
                unkown = this.readInt(8)
                value = Boolean(this.readInt(1))
                break
            case 'FloatProperty':
                val_len = this.readInt(8)
                value = this.readFloat(val_len)
                break
            case 'NameProperty':
                unkown = this.readInt(8)
                value = this.readString()
                break
            case 'ArrayProperty':
                var cur_pos = this.pos

                var len_in_file = this.readInt(8)
                var arr_len = this.readInt()

                value = []

                for (var i=0; i<arr_len; i++) {
                    value.push(this.readProps())
                }
                break
            default:
                console.error('Unkown type:', type_name.slice(0, 20))
                return
        }

        return {
            'name': prop_name,
            'value': value,
        }
    }
}

exports.parse = function(replay) {
    return new Replay(replay);
};
